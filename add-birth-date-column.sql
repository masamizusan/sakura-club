-- birth_dateフィールドをprofilesテーブルに追加
-- 新規登録時の必須フィールドとして追加

DO $$ 
BEGIN
    -- birth_date列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
        ALTER TABLE profiles ADD COLUMN birth_date DATE;
        RAISE NOTICE 'birth_date column added to profiles table';
    ELSE
        RAISE NOTICE 'birth_date column already exists in profiles table';
    END IF;
END $$;