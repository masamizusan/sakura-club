# 📋 指示書：プロフィール完成度計算の最適化（多重発火防止）

## 🎯 目的

プロフィール編集画面（`src/app/profile/edit/page.tsx`）において、画像の追加・削除操作時に完成度計算が多重発火する問題を解決する。

**重要**: SSOT設計（MAIN WATCHを唯一のエントリーポイントとする）を維持したまま最適化を行う。

---

## 🚨 現在の問題

### 症状
以下のログが1回の操作で50回以上出力される：
```
🧹 NORMALIZE TAGS
🛡️ updateCompletionUnified: ハイドレーション未完了のため計算スキップ
❌ Culture tags MISSING
```

### 影響
1. **パフォーマンス劣化**: 不要な計算が繰り返し実行される
2. **ログスパム**: デバッグが困難になる
3. **不安定性**: `Culture tags MISSING` が断続的に表示される
4. **UX悪化**: 画像追加・削除時に処理が重くなる

### 根本原因
React Hook Formの `watch` が以下のタイミングで発火する：
- 画像配列の各要素変更時
- `hobbies`, `personality`, `language_skills` 等の配列フィールド変更時
- チェックボックスの各項目ON/OFF時

**結果**: 同一フレーム内で `watch` が連続発火 → 完成度計算が多重実行される

---

## ✅ 提案する解決策

### 基本戦略
**スケジューリング機構の導入** - `requestAnimationFrame` とシグネチャ比較によるデバウンス

### 実装アプローチ

#### 1. スケジューリング用 ref の追加
```typescript
const pendingCalcRef = useRef(false)  // 計算予約フラグ
const lastSigRef = useRef<string>("")  // 前回計算時のシグネチャ
```

#### 2. スケジュール関数の実装
```typescript
/**
 * 完成度計算をスケジューリング（重複排除付き）
 * - 同一フレーム内の複数呼び出しを1回にまとめる
 * - 前回と同じシグネチャなら計算をスキップ
 */
const scheduleCompletionCalc = useCallback((reason: string) => {
  // ガード: 初期化中・ハイドレーション未完了時はスキップ
  if (isInitializing || !isHydrated) {
    console.log('🛡️ scheduleCompletionCalc: 初期化中のためスキップ', { reason })
    return
  }

  // すでに予約済みなら重複実行を防止
  if (pendingCalcRef.current) {
    console.log('⏭️ scheduleCompletionCalc: すでに予約済み、スキップ', { reason })
    return
  }

  console.log('📅 scheduleCompletionCalc: 計算を予約', { reason })
  pendingCalcRef.current = true

  requestAnimationFrame(() => {
    pendingCalcRef.current = false

    // 現在のフォーム値を取得
    const values = getValues()

    // シグネチャ生成（完成度計算に影響する主要フィールドのみ）
    const signature = JSON.stringify({
      photo_urls: values.photo_urls?.length || 0,
      hobbies: values.hobbies?.length || 0,
      personality: values.personality?.length || 0,
      language_skills: values.language_skills?.length || 0,
      culture_tags: values.culture_tags?.length || 0,
      // 必須項目
      birth_date: values.birth_date,
      height: values.height,
      nationality: values.nationality,
      gender_identity: values.gender_identity,
      user_type: values.user_type,
      // タイプ別必須項目
      prefecture: values.prefecture,
      city: values.city,
      visit_schedule: values.visit_schedule,
      travel_companion: values.travel_companion,
    })

    // 前回と同じなら計算スキップ
    if (signature === lastSigRef.current) {
      console.log('⏭️ scheduleCompletionCalc: シグネチャ一致、計算スキップ')
      return
    }

    lastSigRef.current = signature
    console.log('🔄 scheduleCompletionCalc: 完成度計算実行', { reason, signature })

    // 実際の計算実行
    updateCompletionUnified("MAIN_WATCH_SCHEDULED:" + reason)
  })
}, [isInitializing, isHydrated, getValues])
```

#### 3. MAIN WATCH の修正
```typescript
// 🎯 MAIN WATCH: 完成度再計算の唯一のエントリーポイント（SSOT）
useEffect(() => {
  if (isInitializing || !isHydrated) {
    console.log('🛡️ MAIN WATCH: 初期化中のため計算スキップ')
    return
  }

  const subscription = watch((value, { name, type }) => {
    console.log('👁️ MAIN WATCH: フィールド変更検出', { name, type })

    // スケジューリング関数を呼び出し（多重発火を防止）
    scheduleCompletionCalc(`field:${name}`)
  })

  return () => subscription.unsubscribe()
}, [watch, isInitializing, isHydrated, scheduleCompletionCalc])
```

#### 4. 画像変更時の処理修正
```typescript
// 画像追加時
const handleImageAdd = (newImage: string) => {
  // ... 既存の画像追加処理 ...

  // 完成度計算をスケジューリング（直接呼び出しを削除）
  scheduleCompletionCalc('image:add')
}

// 画像削除時
const handleImageDelete = (index: number) => {
  // ... 既存の画像削除処理 ...

  // 完成度計算をスケジューリング（直接呼び出しを削除）
  scheduleCompletionCalc('image:delete')
}
```

---

## 🔒 絶対に守るべき制約（MUST NOT VIOLATE）

### 1. SSOT原則の維持
- ✅ **MAIN WATCH を唯一のエントリーポイントとして維持**
- ❌ 完成度計算を複数箇所から直接呼び出さない
- ❌ `updateCompletionUnified` を watch 以外から呼ばない（初期化時の強制計算を除く）

### 2. 保護対象ファイルの不変性
- ❌ **`src/utils/profileCompletion.ts` を一切変更しない**
- ❌ **完成度計算ロジック（14項目/17項目）を変更しない**
- ❌ **画像検出の5つのフォールバック機構を変更しない**

### 3. 既存機能の維持
- ✅ マイページ（100%）→ プロフィール編集画面（100%）一貫性を維持
- ✅ fromMyPage遷移での画像読み込みを維持
- ✅ 初期化フラグ（isInitializing/isHydrated）のガード機能を維持
- ✅ TEST MODE の動作を維持

### 4. デバッグ可能性の維持
- ✅ 重要なログは残す（ただし多重出力は削減）
- ✅ スケジューリングの動作が追跡可能なログを追加
- ✅ シグネチャ比較でスキップした場合もログに記録

---

## 📝 実装対象ファイル

### メインファイル
**`src/app/profile/edit/page.tsx`**
- 場所: MAIN WATCH の useEffect 周辺
- 追加: `scheduleCompletionCalc` 関数
- 修正: watch コールバック、画像操作ハンドラー

### 変更禁止ファイル（読み取り専用）
- `src/utils/profileCompletion.ts` - 完成度計算ロジック
- `src/app/mypage/page.tsx` - マイページの完成度表示
- `src/utils/saveProfileToDb.ts` - DB保存パイプライン

---

## ✅ 動作確認手順

### テストケース1: 画像追加（外国人男性）
1. プロフィール編集画面を開く
2. 画像を1枚追加
3. **期待結果**:
   - `🧹 NORMALIZE TAGS` が1回のみ表示
   - `📅 scheduleCompletionCalc: 計算を予約` が1回表示
   - `🔄 scheduleCompletionCalc: 完成度計算実行` が1回表示
   - 完成度が正しく更新される

### テストケース2: 複数フィールド変更
1. チェックボックス（性格・文化）を3つON/OFF
2. **期待結果**:
   - `📅 scheduleCompletionCalc: 計算を予約` が複数回表示（各変更で予約）
   - `⏭️ すでに予約済み、スキップ` が表示（重複排除）
   - `🔄 scheduleCompletionCalc: 完成度計算実行` が1回のみ表示
   - 完成度が最終状態で正しく計算される

### テストケース3: 初期化中の保護
1. MyPageからプロフィール編集画面に遷移
2. **期待結果**:
   - `🛡️ scheduleCompletionCalc: 初期化中のためスキップ` が表示
   - ハイドレーション完了後に1回だけ計算実行
   - 完成度が100%のまま維持される

### テストケース4: fromMyPage遷移（重要）
1. マイページ（100%）からプロフィール編集画面に遷移
2. 完成度表示を確認
3. 画像を1枚追加
4. **期待結果**:
   - 初期表示: 100%維持
   - 画像追加後: スケジューリング経由で1回のみ計算
   - ログスパムなし

---

## 🧪 成功基準

### パフォーマンス
- ✅ 1回の操作で `🧹 NORMALIZE TAGS` が1回のみ出力
- ✅ `updateCompletionUnified` の実行回数が90%以上削減
- ✅ 画像追加・削除が体感的に軽快になる

### 機能
- ✅ 完成度計算が正確（14項目/17項目）
- ✅ マイページ→Edit遷移で100%維持
- ✅ Preview→Edit遷移で完成度維持
- ✅ 初期化中のガードが機能

### 安定性
- ✅ `❌ Culture tags MISSING` が表示されない
- ✅ シグネチャ比較で不要な計算をスキップ
- ✅ エラーログが出ない

---

## 🚨 緊急時の復旧手順

### 問題発生時
もしこの最適化により完成度計算が壊れた場合：

```bash
# 最適化前の状態に戻す
git revert <this-commit-hash>
git commit -m "緊急復旧: 完成度計算最適化を一時的にロールバック"
git push

# または完全復旧（CLAUDE.mdに記載の完璧な状態に戻す）
git checkout 9e1d2042 -- src/app/profile/edit/page.tsx
git commit -m "🚨緊急復旧: プロフィール編集画面を完璧状態に戻す (9e1d2042)"
```

---

## 📚 参考情報

### 関連する既存の完璧な実装
- **完成度計算の心臓部**: `src/utils/profileCompletion.ts`
- **5つのフォールバック画像検出**: CLAUDE.md 参照
- **SSOT設計原則**: CLAUDE.md "恒久仕様" セクション参照

### コミット履歴
- `9e1d2042` - プロフィールサイクル完全多言語対応（最新の完璧な状態）
- `1dc2b296` - Bucket名修正（profile-images → avatars）
- `86fab4c2` - photo_urls保存修正

---

## 🔐 最終確認チェックリスト

実装完了前に以下を確認すること：

- [ ] `profileCompletion.ts` を変更していないか
- [ ] MAIN WATCH が唯一のエントリーポイントのままか
- [ ] isInitializing/isHydrated ガードが機能しているか
- [ ] シグネチャ比較ロジックが正しいか
- [ ] ログが適切に出力されるか
- [ ] 4つのテストケースが全て成功するか
- [ ] fromMyPage遷移で100%が維持されるか
- [ ] 画像追加・削除で多重発火が防止されているか

---

**📅 作成日**: 2026-01-18
**🎯 対象バージョン**: 9e1d2042以降
**⚠️ 重要度**: 高（パフォーマンス最適化、ただしコア機能に影響あり）
**🔒 保護対象**: SSOT設計、完成度計算ロジック、初期化フラグシステム
