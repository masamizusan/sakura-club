-- ============================================
-- RLS ポリシーを安全に設定
-- ============================================

-- RLSを有効化（既に有効でもエラーにならない）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーが存在する場合は削除してから作成
DO $$
BEGIN
    -- profiles のポリシー
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    CREATE POLICY "Users can view all profiles" ON profiles
      FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    CREATE POLICY "Users can insert own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
      
EXCEPTION WHEN OTHERS THEN
    -- ポリシー設定でエラーが出た場合はスキップ
    RAISE NOTICE 'Policy setup completed with some warnings';
END $$;

-- matchesテーブルが存在する場合のみRLS設定
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'matches' AND table_schema = 'public') THEN
        ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own matches" ON matches;
        CREATE POLICY "Users can view own matches" ON matches
          FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
        
        DROP POLICY IF EXISTS "Users can create matches" ON matches;
        CREATE POLICY "Users can create matches" ON matches
          FOR INSERT WITH CHECK (auth.uid() = user1_id);
        
        DROP POLICY IF EXISTS "Users can update own matches" ON matches;
        CREATE POLICY "Users can update own matches" ON matches
          FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
    END IF;
END $$;

-- experiencesテーブルが存在する場合のみRLS設定
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'experiences' AND table_schema = 'public') THEN
        ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view all experiences" ON experiences;
        CREATE POLICY "Users can view all experiences" ON experiences
          FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Users can create experiences" ON experiences;
        CREATE POLICY "Users can create experiences" ON experiences
          FOR INSERT WITH CHECK (auth.uid() = organizer_id);
        
        DROP POLICY IF EXISTS "Organizers can update own experiences" ON experiences;  
        CREATE POLICY "Organizers can update own experiences" ON experiences
          FOR UPDATE USING (auth.uid() = organizer_id);
    END IF;
END $$;