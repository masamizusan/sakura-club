-- ============================================
-- 不足している列を安全に追加
-- ============================================

-- まず、profilesテーブルに必要な列があるかチェックして追加
DO $$ 
BEGIN
    -- first_name列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
    
    -- last_name列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
    
    -- gender列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE profiles ADD COLUMN gender TEXT;
    END IF;
    
    -- age列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'age') THEN
        ALTER TABLE profiles ADD COLUMN age INTEGER;
    END IF;
    
    -- nationality列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'nationality') THEN
        ALTER TABLE profiles ADD COLUMN nationality TEXT;
    END IF;
    
    -- prefecture列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'prefecture') THEN
        ALTER TABLE profiles ADD COLUMN prefecture TEXT;
    END IF;
    
    -- city列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'city') THEN
        ALTER TABLE profiles ADD COLUMN city TEXT;
    END IF;
    
    -- hobbies列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'hobbies') THEN
        ALTER TABLE profiles ADD COLUMN hobbies TEXT[] DEFAULT '{}';
    END IF;
    
    -- self_introduction列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'self_introduction') THEN
        ALTER TABLE profiles ADD COLUMN self_introduction TEXT;
    END IF;
    
    -- is_verified列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- membership_type列が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'membership_type') THEN
        ALTER TABLE profiles ADD COLUMN membership_type TEXT DEFAULT 'free';
    END IF;
END $$;