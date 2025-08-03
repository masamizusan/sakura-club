-- 通知テーブル
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 体験レビューテーブル
CREATE TABLE IF NOT EXISTS experience_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(experience_id, reviewer_id)
);

-- 体験参加者テーブル
CREATE TABLE IF NOT EXISTS experience_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(experience_id, user_id)
);

-- インデックスの作成
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_experience_reviews_experience_id ON experience_reviews(experience_id);
CREATE INDEX idx_experience_reviews_reviewer_id ON experience_reviews(reviewer_id);
CREATE INDEX idx_experience_reviews_rating ON experience_reviews(rating);

CREATE INDEX idx_experience_participants_experience_id ON experience_participants(experience_id);
CREATE INDEX idx_experience_participants_user_id ON experience_participants(user_id);
CREATE INDEX idx_experience_participants_status ON experience_participants(status);

-- RLS ポリシーの設定
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_participants ENABLE ROW LEVEL SECURITY;

-- 通知のRLSポリシー
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- レビューのRLSポリシー
CREATE POLICY "Anyone can view reviews" ON experience_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for experiences they participated in" ON experience_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM experience_participants ep
      WHERE ep.experience_id = experience_reviews.experience_id
      AND ep.user_id = auth.uid()
      AND ep.status = 'completed'
    )
  );

CREATE POLICY "Users can update their own reviews" ON experience_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" ON experience_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- 参加者のRLSポリシー
CREATE POLICY "Anyone can view confirmed participants" ON experience_participants
  FOR SELECT USING (status IN ('confirmed', 'completed'));

CREATE POLICY "Users can create their own participation" ON experience_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON experience_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- 体験主催者は自分の体験の参加者を管理できる
CREATE POLICY "Organizers can manage their experience participants" ON experience_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_participants.experience_id
      AND e.organizer_id = auth.uid()
    )
  );

-- 自動的にupdated_atを更新する関数とトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_reviews_updated_at
  BEFORE UPDATE ON experience_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_participants_updated_at
  BEFORE UPDATE ON experience_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ストレージバケットの作成（プロフィール画像用）
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true);

-- プロフィール画像のストレージポリシー
CREATE POLICY "Users can upload their own profile images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view profile images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

CREATE POLICY "Users can update their own profile images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );