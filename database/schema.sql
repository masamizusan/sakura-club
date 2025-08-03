-- SAKURA CLUB データベーススキーマ
-- Supabase用のSQLスキーマファイル

-- まず既存のテーブルを削除（必要に応じて）
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS matches CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS experiences CASCADE;
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;

-- プロフィールテーブル
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  last_name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  age INTEGER CHECK (age >= 18 AND age <= 100),
  nationality TEXT,
  residence TEXT, -- 都道府県
  city TEXT,
  interests TEXT[], -- 趣味・興味（配列）
  bio TEXT, -- 自己紹介
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  membership_type TEXT DEFAULT 'free' CHECK (membership_type IN ('free', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 文化体験テーブル
CREATE TABLE IF NOT EXISTS experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('tea-ceremony', 'calligraphy', 'cooking', 'flower-arrangement', 'martial-arts', 'traditional-crafts', 'music', 'dance', 'festival', 'other')),
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  max_participants INTEGER DEFAULT 10,
  current_participants INTEGER DEFAULT 0,
  price INTEGER DEFAULT 0, -- 円単位
  included_items TEXT[], -- 体験に含まれるもの
  required_items TEXT[], -- 持参物
  requirements TEXT, -- 参加条件
  image_url TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 体験参加者テーブル
CREATE TABLE IF NOT EXISTS experience_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'joined' CHECK (status IN ('joined', 'cancelled')),
  UNIQUE(experience_id, participant_id)
);

-- マッチングテーブル
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user1_liked BOOLEAN DEFAULT FALSE,
  user2_liked BOOLEAN DEFAULT FALSE,
  matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- メッセージテーブル
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- レビューテーブル
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(experience_id, reviewer_id)
);

-- 通知テーブル
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('match', 'message', 'experience_invitation', 'experience_reminder', 'review_request', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- 追加のデータ（リンク先などの情報）
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- いいね/パステーブル（マッチング用）
CREATE TABLE IF NOT EXISTS user_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  liked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  liked BOOLEAN NOT NULL, -- TRUE: いいね, FALSE: パス
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(liker_id, liked_id),
  CHECK (liker_id != liked_id)
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_residence ON profiles(residence);
CREATE INDEX IF NOT EXISTS idx_experiences_category ON experiences(category);
CREATE INDEX IF NOT EXISTS idx_experiences_date ON experiences(date);
CREATE INDEX IF NOT EXISTS idx_experiences_organizer ON experiences(organizer_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_likes_liker ON user_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_liked ON user_likes(liked_id);

-- RLS (Row Level Security) の有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

-- RLS ポリシーの作成

-- プロフィール: 自分のプロフィールは読み書き可能、他人のプロフィールは読み取り専用
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 体験: 公開されている体験は誰でも閲覧可能、主催者は自分の体験を管理可能
CREATE POLICY "Anyone can view experiences" ON experiences FOR SELECT USING (true);
CREATE POLICY "Users can create experiences" ON experiences FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update own experiences" ON experiences FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete own experiences" ON experiences FOR DELETE USING (auth.uid() = organizer_id);

-- 体験参加者: 参加者は自分の参加状況を管理可能
CREATE POLICY "Users can view experience participants" ON experience_participants FOR SELECT USING (true);
CREATE POLICY "Users can join experiences" ON experience_participants FOR INSERT WITH CHECK (auth.uid() = participant_id);
CREATE POLICY "Users can manage own participation" ON experience_participants FOR UPDATE USING (auth.uid() = participant_id);
CREATE POLICY "Users can cancel own participation" ON experience_participants FOR DELETE USING (auth.uid() = participant_id);

-- マッチ: 関係者のみ閲覧・操作可能
CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can update own matches" ON matches FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- メッセージ: マッチした相手とのメッセージのみ閲覧・送信可能
CREATE POLICY "Users can view messages in their matches" ON messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = messages.match_id 
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );
CREATE POLICY "Users can send messages in their matches" ON messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = messages.match_id 
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- レビュー: 体験参加者のみレビュー投稿可能、レビューは公開
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Participants can create reviews" ON reviews 
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM experience_participants 
      WHERE experience_participants.experience_id = reviews.experience_id 
      AND experience_participants.participant_id = auth.uid()
    )
  );
CREATE POLICY "Reviewers can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- 通知: 自分の通知のみ閲覧・管理可能
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- いいね/パス: 自分のアクションのみ管理可能
CREATE POLICY "Users can view all likes" ON user_likes FOR SELECT USING (true);
CREATE POLICY "Users can create likes" ON user_likes FOR INSERT WITH CHECK (auth.uid() = liker_id);
CREATE POLICY "Users can update own likes" ON user_likes FOR UPDATE USING (auth.uid() = liker_id);

-- トリガー関数: プロフィール作成時の自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー: 新規ユーザー登録時にプロフィール作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 更新日時の自動更新用関数
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- プロフィールと体験、レビューに更新日時トリガーを追加
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();