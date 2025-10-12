-- ============================================
-- 言語レベル列を安全に追加
-- 完成度計算に影響を与えないよう、既存データを保護
-- ============================================

DO $$
BEGIN
    -- japanese_level列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'japanese_level') THEN
        ALTER TABLE profiles ADD COLUMN japanese_level TEXT;
        RAISE NOTICE 'Added japanese_level column';
    ELSE
        RAISE NOTICE 'japanese_level column already exists';
    END IF;

    -- english_level列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'english_level') THEN
        ALTER TABLE profiles ADD COLUMN english_level TEXT;
        RAISE NOTICE 'Added english_level column';
    ELSE
        RAISE NOTICE 'english_level column already exists';
    END IF;
END $$;

-- 結果確認用クエリ
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('japanese_level', 'english_level')
ORDER BY column_name;

-- 安全性確認: 既存のプロフィール数をチェック
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN japanese_level IS NOT NULL THEN 1 END) as with_japanese_level,
  COUNT(CASE WHEN english_level IS NOT NULL THEN 1 END) as with_english_level
FROM profiles;