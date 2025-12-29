# 🧪 MyPage 93%問題修正テストケース

## 📋 テスト目的
personality_tags のnull→[]正規化により「プロフィール編集100% → MyPage 93%」問題が解決することを確認

## ⚙️ 修正内容概要
1. **保存時正規化**: personality_tags/culture_tagsを必ず配列として保存（null禁止）
2. **読み込み時正規化**: フォーム初期値・MyPage表示でnull→[]変換
3. **既存データ正規化**: DBのnull値を一括で[]に変換

## 🎯 テストケース

### ケース1: 未入力（任意）- 93%確認
**目的**: personality_tags未選択でも保存でき、完成度は93%になることを確認

**手順**:
1. 日本人女性プロフィール編集画面にアクセス
2. personality_tags（性格）を**一切選択しない**
3. 他の14項目は全て入力
4. 保存ボタンクリック

**期待結果**:
- ✅ 保存が成功する（UX維持）
- ✅ コンソールで `🔧 NULL禁止正規化完了` ログに `personalityTags_normalized: []` 
- ✅ DB確認で `personality_tags = '{}'` または `personality_tags = []` (nullではない)
- ✅ MyPageで完成度 **93%（14/15）** 表示
- ✅ `🧩 COMPLETION INTERNAL` で `missing: ["personality_tags"]` 確認

### ケース2: 入力あり - 100%確認
**目的**: personality_tags選択時に100%になることを確認

**手順**:
1. ケース1と同じ状態から続行
2. personality_tags（性格）で **1つ以上** を選択
3. 保存ボタンクリック

**期待結果**:
- ✅ 保存が成功する
- ✅ コンソールで `personalityTags_normalized: ["選択した性格"]`
- ✅ DB確認で `personality_tags = '{"選択した性格"}'` 
- ✅ MyPageで完成度 **100%（15/15）** 表示
- ✅ `🧩 COMPLETION INTERNAL` で `missing: []` (空配列) 確認

### ケース3: 既存null値ユーザー対応確認
**目的**: 既存のnull値ユーザーが正常に動作することを確認

**前提**: DBで `fix-personality-null-to-array.sql` 実行済み

**手順**:
1. 以前にnull値だったユーザーでログイン
2. プロフィール編集画面アクセス

**期待結果**:
- ✅ `🔍 PERSONALITY NULL→[]正規化チェック` で `will_normalize_to_empty_array: false` (正規化不要)
- ✅ MyPageで正確な完成度表示（null による誤計算なし）

## 📊 確認すべきログ

### 1. プロフィール編集画面
```javascript
🔧 NULL禁止正規化完了: {
  personalityTags_normalized: [], // または ["選択項目"]
  personalityTags_isArray: true,
  null_prevention_success: "personalityTags/cultureTagsは必ず配列として保存される"
}
```

### 2. MyPage
```javascript
🧩 DB DATA CHECK + NULL NORMALIZATION: {
  db_personality_tags_isNull: false, // 重要: nullでないことを確認
  normalized_personality_length: 0, // または選択数
  null_normalization_applied: {
    personality_tags: "配列または他の値" // 重要: "null→[]変換済み"でないこと
  }
}

🧩 COMPLETION INTERNAL {
  completed: 14, // または15
  missing: ["personality_tags"], // または[]
  shouldEqual15: true
}
```

## 🚨 失敗パターン
- ❌ `db_personality_tags: null` が残る → DB正規化SQL未実行
- ❌ `personalityTags_normalized: null` → 保存時正規化失敗
- ❌ `missing: ["personality_tags"]` かつ選択済み → 読み込み時正規化失敗
- ❌ 完成度が100%にならない（選択時） → 完成度計算ロジック問題

## 🎉 成功条件
1. **未入力時**: 93%（14/15）で`missing: ["personality_tags"]`
2. **入力時**: 100%（15/15）で`missing: []`
3. **DB確認**: personality_tagsがnullではなく配列として保存
4. **UX維持**: 未入力でも保存・遷移が可能