-- 🛠️ profiles テーブル RLS ポリシー修正 SQL
-- 実行前提: debug-rls-production.sql で問題特定済み
-- 実行方法: Supabase Dashboard > SQL Editor で実行

-- 🔍 STEP 1: 現在のRLSポリシー確認（再確認）
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 🛠️ STEP 2: 既存のUPDATEポリシーを削除（もしあれば）
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 🛠️ STEP 3: 新しい包括的UPDATEポリシーを作成
-- personality_tags と culture_tags を明示的に許可
CREATE POLICY "Enable users to update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 🛠️ STEP 4: INSERTポリシーも確認・修正（新規ユーザー対応）
CREATE POLICY IF NOT EXISTS "Enable users to insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 🛠️ STEP 5: SELECTポリシーも確認（読み取り権限）
CREATE POLICY IF NOT EXISTS "Enable users to select their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 🔍 STEP 6: 修正後のポリシー確認
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 🧪 STEP 7: 修正後テスト（personality_tags/culture_tags更新）
UPDATE public.profiles 
SET 
    personality_tags = ARRAY['修正後テスト性格1', '修正後テスト性格2'],
    culture_tags = ARRAY['修正後テスト文化1', '修正後テスト文化2'],
    updated_at = NOW()
WHERE id = auth.uid();

-- 🔍 STEP 8: 修正結果確認
SELECT 
    id,
    personality_tags,
    culture_tags,
    updated_at
FROM public.profiles 
WHERE id = auth.uid();