-- ============================================
-- 不足しているテーブルのみを作成
-- ============================================

-- matchesテーブルが存在しない場合のみ作成
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'matches' AND table_schema = 'public') THEN
        CREATE TABLE matches (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user1_id, user2_id),
            CHECK (user1_id != user2_id)
        );
    END IF;
END $$;

-- experiencesテーブルが存在しない場合のみ作成
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'experiences' AND table_schema = 'public') THEN
        CREATE TABLE experiences (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            date DATE NOT NULL,
            time_start TIME NOT NULL,
            time_end TIME NOT NULL,
            location TEXT NOT NULL,
            prefecture TEXT NOT NULL,
            city TEXT NOT NULL,
            max_participants INTEGER NOT NULL CHECK (max_participants > 0),
            current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
            price INTEGER DEFAULT 0 CHECK (price >= 0),
            currency TEXT DEFAULT 'JPY',
            organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            status TEXT DEFAULT 'upcoming',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CHECK (current_participants <= max_participants),
            CHECK (time_end > time_start)
        );
    END IF;
END $$;

-- experience_participantsテーブルが存在しない場合のみ作成
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'experience_participants' AND table_schema = 'public') THEN
        CREATE TABLE experience_participants (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            status TEXT DEFAULT 'registered',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(experience_id, user_id)
        );
    END IF;
END $$;

-- messagesテーブルが存在しない場合のみ作成
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'messages' AND table_schema = 'public') THEN
        CREATE TABLE messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            content TEXT NOT NULL,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CHECK (sender_id != receiver_id)
        );
    END IF;
END $$;