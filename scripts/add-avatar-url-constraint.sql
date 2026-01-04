-- 🔒 profiles.avatar_url Base64遮断用DB制約（物理ロック）
-- 
-- 目的: アプリのバグが再発してもDBレベルでBase64保存を完全阻止
-- 効果: どんな経路でも data:image/ 保存が不可能になる

-- 1. 既存のBase64データ確認（実行前にチェック）
SELECT 
  id, 
  user_id,
  CASE 
    WHEN avatar_url LIKE 'data:image/%' THEN 'BASE64_DETECTED'
    WHEN avatar_url IS NULL THEN 'NULL'
    WHEN avatar_url LIKE 'http%' THEN 'HTTP_URL'
    ELSE 'OTHER'
  END as avatar_url_type,
  LENGTH(avatar_url) as avatar_url_length,
  LEFT(avatar_url, 30) as avatar_url_preview
FROM profiles 
WHERE avatar_url IS NOT NULL
ORDER BY 
  CASE WHEN avatar_url LIKE 'data:image/%' THEN 1 ELSE 2 END,
  LENGTH(avatar_url) DESC
LIMIT 10;

-- 2. 既存Base64データのnull化（制約追加前の必須処理）
-- ⚠️ 注意: これにより既存のBase64画像は表示されなくなります
-- 代替案: Base64→Storage移行処理を実行してからこのスクリプトを実行
UPDATE profiles 
SET 
  avatar_url = NULL,
  updated_at = NOW()
WHERE avatar_url LIKE 'data:image/%';

-- 3. CHECK制約の追加（Base64完全遮断）
ALTER TABLE profiles 
ADD CONSTRAINT avatar_url_no_base64_check 
CHECK (
  avatar_url IS NULL OR 
  avatar_url NOT LIKE 'data:image/%'
);

-- 4. 制約確認
SELECT 
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.check_constraints 
WHERE table_name = 'profiles' 
  AND constraint_name = 'avatar_url_no_base64_check';

-- 5. テスト（Base64保存の試行 - 失敗することを確認）
-- INSERT INTO profiles (user_id, email, avatar_url) 
-- VALUES ('test-user', 'test@example.com', 'data:image/jpeg;base64,ABC123');
-- → エラー: new row for relation "profiles" violates check constraint "avatar_url_no_base64_check"

-- 6. 制約削除（必要時のみ）
-- ALTER TABLE profiles DROP CONSTRAINT avatar_url_no_base64_check;