-- 🚨 CRITICAL: 既存DB内のpersonality_tags/culture_tags null→[]一括正規化SQL
-- 実行方法: Supabase Dashboard > SQL Editor で実行
-- 目的: MyPage 93%問題の根本解決（null値によるcompleted判定ミス防止）

-- 🔍 STEP 1: 現在のnull値状況確認
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN personality_tags IS NULL THEN 1 END) as personality_tags_null_count,
    COUNT(CASE WHEN culture_tags IS NULL THEN 1 END) as culture_tags_null_count,
    COUNT(CASE WHEN personality_tags IS NULL AND culture_tags IS NULL THEN 1 END) as both_null_count
FROM public.profiles;

-- 🔍 STEP 2: 具体的なnull値データ確認（最大10件）
SELECT 
    id,
    name,
    personality_tags,
    culture_tags,
    personality_tags IS NULL as personality_is_null,
    culture_tags IS NULL as culture_is_null
FROM public.profiles 
WHERE personality_tags IS NULL OR culture_tags IS NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 🚨 STEP 3: personality_tags null→[]一括正規化
-- text[]型の場合: '{}'::text[] を使用
UPDATE public.profiles 
SET personality_tags = '{}'::text[]
WHERE personality_tags IS NULL;

-- 🚨 STEP 4: culture_tags null→[]一括正規化  
-- text[]型の場合: '{}'::text[] を使用
UPDATE public.profiles 
SET culture_tags = '{}'::text[]
WHERE culture_tags IS NULL;

-- 🔍 STEP 5: 正規化結果確認
SELECT 
    COUNT(*) as total_profiles_after,
    COUNT(CASE WHEN personality_tags IS NULL THEN 1 END) as personality_tags_null_count_after,
    COUNT(CASE WHEN culture_tags IS NULL THEN 1 END) as culture_tags_null_count_after,
    COUNT(CASE WHEN Array_length(personality_tags, 1) = 0 OR personality_tags = '{}' THEN 1 END) as personality_empty_array_count,
    COUNT(CASE WHEN Array_length(culture_tags, 1) = 0 OR culture_tags = '{}' THEN 1 END) as culture_empty_array_count
FROM public.profiles;

-- 🔍 STEP 6: 正規化サンプル確認（変更後のデータ例）
SELECT 
    id,
    name,
    personality_tags,
    culture_tags,
    Array_length(personality_tags, 1) as personality_length,
    Array_length(culture_tags, 1) as culture_length
FROM public.profiles 
ORDER BY updated_at DESC
LIMIT 5;

-- 📊 STEP 7: データ型確認（もしjsonb型の場合は下記SQLに変更）
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name IN ('personality_tags', 'culture_tags');

-- 🔧 ALTERNATIVE: もしjsonb型の場合は下記を使用
-- UPDATE public.profiles SET personality_tags = '[]'::jsonb WHERE personality_tags IS NULL;
-- UPDATE public.profiles SET culture_tags = '[]'::jsonb WHERE culture_tags IS NULL;