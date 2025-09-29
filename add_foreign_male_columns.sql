-- ============================================
-- 外国人男性専用フィールドを安全に追加
-- ============================================

DO $$
BEGIN
    -- visit_schedule列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'visit_schedule') THEN
        ALTER TABLE profiles ADD COLUMN visit_schedule TEXT;
        RAISE NOTICE 'Added visit_schedule column';
    ELSE
        RAISE NOTICE 'visit_schedule column already exists';
    END IF;

    -- travel_companion列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'travel_companion') THEN
        ALTER TABLE profiles ADD COLUMN travel_companion TEXT;
        RAISE NOTICE 'Added travel_companion column';
    ELSE
        RAISE NOTICE 'travel_companion column already exists';
    END IF;

    -- planned_prefectures列が存在しない場合のみ追加（JSON配列として保存）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'planned_prefectures') THEN
        ALTER TABLE profiles ADD COLUMN planned_prefectures TEXT[];
        RAISE NOTICE 'Added planned_prefectures column';
    ELSE
        RAISE NOTICE 'planned_prefectures column already exists';
    END IF;
END $$;

-- 結果確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('visit_schedule', 'travel_companion', 'planned_prefectures')
ORDER BY column_name;