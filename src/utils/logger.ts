// src/utils/logger.ts
// 🛡️ ログユーティリティ - Base64画像マスク＋ログレベル切替

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 999,
};

function getLogLevel(): LogLevel {
  // ブラウザ側で使う前提なので NEXT_PUBLIC を優先
  let v: string = "info";

  if (typeof process !== 'undefined' && process.env) {
    v = process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL || "info";
  }

  if (v in LEVEL_ORDER) return v as LogLevel;
  return "info";
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
