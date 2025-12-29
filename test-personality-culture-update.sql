-- 🧪 personality_tags/culture_tags 更新テスト SQL
-- 実行方法: Supabase Dashboard > SQL Editor で実行

-- 🔍 STEP 1: 現在のユーザーID確認
SELECT auth.uid() as current_user_id;

-- 🔍 STEP 2: 指定ユーザーの現在のデータ確認
SELECT 
    id,
    name,
    personality_tags,
    culture_tags,
    interests,
    hobbies,
    updated_at
FROM public.profiles 
WHERE id = auth.uid()  -- 現在のユーザーのみ
LIMIT 1;

-- 🧪 STEP 3: personality_tags 単体更新テスト（RLSポリシー確認）
UPDATE public.profiles 
SET 
    personality_tags = ARRAY['優しい', '冷静', 'テスト性格'] 
WHERE id = auth.uid();

-- 🔍 STEP 4: 更新結果確認
SELECT 
    id,
    personality_tags,
    updated_at
FROM public.profiles 
WHERE id = auth.uid();

-- 🧪 STEP 5: culture_tags 単体更新テスト（RLSポリシー確認）
UPDATE public.profiles 
SET 
    culture_tags = ARRAY['茶道', '書道', 'テスト文化'] 
WHERE id = auth.uid();

-- 🔍 STEP 6: 更新結果確認
SELECT 
    id,
    culture_tags,
    updated_at
FROM public.profiles 
WHERE id = auth.uid();

-- 🧪 STEP 7: 両フィールド同時更新テスト
UPDATE public.profiles 
SET 
    personality_tags = ARRAY['同時更新性格1', '同時更新性格2'],
    culture_tags = ARRAY['同時更新文化1', '同時更新文化2'],
    updated_at = NOW()
WHERE id = auth.uid();

-- 🔍 STEP 8: 最終結果確認
SELECT 
    id,
    name,
    personality_tags,
    culture_tags,
    updated_at
FROM public.profiles 
WHERE id = auth.uid();

-- 🔍 STEP 9: エラーログ確認（もしあれば）
-- この時点でエラーが発生した場合、RLSポリシーまたは権限に問題があることが確定