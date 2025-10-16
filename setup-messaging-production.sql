-- Sakura Club: メッセージング機能のプロダクション用セットアップ
-- 実行日: 2025-10-16

-- 1. 既存ユーザーの確認
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email IN ('masamizusan0304@gmail.com', 'test@example.com')
ORDER BY created_at;

-- 2. 既存プロフィールの確認
SELECT 
  id,
  name || ' ' || last_name as full_name,
  email,
  gender,
  nationality
FROM profiles 
ORDER BY created_at
LIMIT 10;

-- 3. 既存マッチの確認（conversationの元になるデータ）
SELECT 
  id,
  liker_user_id,
  liked_user_id,
  is_matched,
  matched_at,
  created_at
FROM matches 
WHERE is_matched = true
ORDER BY matched_at DESC;

-- 4. 現在のconversationsテーブル確認
SELECT 
  id,
  user1_id,
  user2_id,
  created_at
FROM conversations
ORDER BY created_at DESC;

-- 5. 現在のmessagesテーブル確認
SELECT 
  id,
  conversation_id,
  sender_id,
  content,
  is_read,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 20;