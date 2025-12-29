-- 🔍 本番環境 Supabase profiles テーブル RLS ポリシー診断
-- 実行方法: Supabase Dashboard > SQL Editor で実行

-- 📊 STEP 1: テーブルのRLS状態確認
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 📊 STEP 2: profiles テーブルの全RLSポリシー確認  
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

-- 📊 STEP 3: profiles テーブルのカラム一覧確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('personality_tags', 'culture_tags', 'personality', 'interests', 'hobbies')
ORDER BY column_name;

-- 📊 STEP 4: 現在のユーザー権限確認
SELECT 
    current_user as current_db_user,
    session_user as session_db_user,
    current_setting('role') as current_role;

-- 📊 STEP 5: profiles テーブルへの基本権限確認
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY grantee, privilege_type;

-- 📊 STEP 6: RLS関連システム関数確認
SELECT 
    proname as function_name,
    pronamespace::regnamespace as schema_name
FROM pg_proc 
WHERE proname LIKE '%auth%' OR proname LIKE '%uid%' OR proname LIKE '%jwt%'
ORDER BY proname;