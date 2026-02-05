// src/utils/logger.ts
// 🛡️ ログユーティリティ - レベル制御＋Base64画像マスク＋payload要約
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 本番安全弁（絶対ルール）
//
//   production + NEXT_PUBLIC_DEBUG 未設定 → warn 以上のみ出力
//   debug / info は本番で"絶対に"出ない
//
// 確認手順（手動1回 — ビルド後に実行）:
//   NODE_ENV=production node -e "
//     process.env.NODE_ENV='production';
//     const {logger}=require('./.next/server/chunks/...'); // or ブラウザDevTools
//     logger.info('SHOULD_NOT_APPEAR');
//     logger.debug('SHOULD_NOT_APPEAR');
//     logger.warn('SHOULD_APPEAR');
//   "
//   → warn だけコンソールに出ればOK
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📏 payload ルール（チーム運用 — 抜け道防止）
//
//   loggerに渡してよい値: string / number / boolean / 短縮ID / 件数
//   配列・オブジェクトを渡す場合: 必ず summarize() を通す
//
//   ✅ logger.debug('[SYNC] hobbies:', items.length, 'items')
//   ✅ logger.debug('[LOAD]', summarize({ userId, name, hobbies }))
//   ❌ logger.debug('[LOAD]', profile)          ← Object丸投げ禁止
//   ❌ logger.debug('[LOAD]', photoUrls)        ← 配列丸投げ禁止
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 999,
};

function getLogLevel(): LogLevel {
  if (typeof process !== 'undefined' && process.env) {
    // NEXT_PUBLIC_DEBUG=true → 全ログ出力（開発時デバッグ用）
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') return 'debug'

    // クライアント側は NEXT_PUBLIC_ のみ参照可能
    const v = process.env.NEXT_PUBLIC_LOG_LEVEL
    if (v && v in LEVEL_ORDER) return v as LogLevel

    // 本番は warn 以上のみ
    if (process.env.NODE_ENV === 'production') return 'warn'
  }
  return 'info'
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[getLogLevel()];
}

/**
 * Base64画像の全文ログは禁止し、prefix+lengthのみ出す
 */
export function maskImageValue(v: any): any {
  if (!v) return v;

  if (typeof v === "string") {
    if (v.startsWith("data:image")) {
      return `[BASE64_IMAGE length=${v.length} prefix="${v.slice(0, 30)}..."]`;
    }
    if (v.startsWith("http")) {
      // URLは長すぎる場合は切り詰め
      if (v.length > 100) {
        return `[URL "${v.slice(0, 80)}..."]`;
      }
      return `[URL "${v}"]`;
    }
    // Supabase storage pathなど
    if (v.includes("supabase") && v.includes("/storage/")) {
      return `[STORAGE_PATH "${v.slice(0, 80)}..."]`;
    }
    return v;
  }

  if (Array.isArray(v)) {
    return v.map(maskImageValue);
  }

  if (typeof v === "object") {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      // 画像関連は必ずマスク
      if (k === "photo_urls" || k === "avatar_url" || k.includes("photo") || k.includes("image")) {
        out[k] = maskImageValue(val);
      } else if (typeof val === "object" && val !== null) {
        // ネストしたオブジェクトも再帰処理
        out[k] = maskImageValue(val);
      } else {
        out[k] = val;
      }
    }
    return out;
  }

  return v;
}

/**
 * payload全体を安全にログ出しする（画像だけ確実にマスク）
 */
export function sanitizePayload(payload: any): any {
  try {
    return maskImageValue(payload);
  } catch {
    return "[UNSERIALIZABLE_PAYLOAD]";
  }
}

/**
 * オブジェクト・配列をログ安全な要約に変換する。
 * logger に Object / Array を直接渡さず、必ずこの関数を通す。
 *
 * 変換ルール:
 *   - string (id系): 先頭8文字に切り詰め
 *   - 配列: "N items" + 先頭1件のみ
 *   - ネストObject: 1階層目のみ（値は型+長さ）
 *   - それ以外: そのまま
 */
export function summarize(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) {
      out[k] = null
    } else if (Array.isArray(v)) {
      out[k] = `${v.length} items` + (v.length > 0 ? ` [0]=${typeof v[0] === 'string' ? v[0].slice(0, 30) : typeof v[0]}` : '')
    } else if (typeof v === 'string') {
      // id系は短縮、長文は切り詰め
      out[k] = v.length > 40 ? v.slice(0, 8) + '...' : v
    } else if (typeof v === 'object') {
      out[k] = `{${Object.keys(v).length} keys}`
    } else {
      out[k] = v // number / boolean はそのまま
    }
  }
  return out
}

/**
 * ログユーティリティ - レベル制御付き
 */
export const logger = {
  debug: (...args: any[]) => {
    if (!shouldLog("debug")) return;
    console.log("🐛", ...args);
  },
  info: (...args: any[]) => {
    if (!shouldLog("info")) return;
    console.log("ℹ️", ...args);
  },
  warn: (...args: any[]) => {
    if (!shouldLog("warn")) return;
    console.warn("⚠️", ...args);
  },
  error: (...args: any[]) => {
    if (!shouldLog("error")) return;
    console.error("❌", ...args);
  },
};

export default logger;
