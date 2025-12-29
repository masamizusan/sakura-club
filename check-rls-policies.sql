-- Supabase profiles テーブルの RLS ポリシー全件確認

-- 1. テーブルのRLS状態確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 2. profiles テーブルの全RLSポリシー確認  
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 3. profiles テーブルのカラム一覧確認（personality_tags/culture_tags存在確認）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('personality_tags', 'culture_tags', 'personality', 'interests')
ORDER BY column_name;

-- 4. 現在のユーザーの権限確認
SELECT current_user, session_user;

-- 5. profiles テーブルへの権限確認
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'profiles';