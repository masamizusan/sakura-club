-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE membership_type AS ENUM ('free', 'premium');
CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE experience_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('registered', 'confirmed', 'cancelled');

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender gender_type NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 99),
  nationality TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  hobbies TEXT[] NOT NULL DEFAULT '{}',
  self_introduction TEXT NOT NULL,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  membership_type membership_type DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status match_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Create experiences table
CREATE TABLE experiences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
  status experience_status DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (current_participants <= max_participants),
  CHECK (time_end > time_start)
);

-- Create experience_participants table
CREATE TABLE experience_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status participant_status DEFAULT 'registered',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experience_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (sender_id != receiver_id)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_nationality ON profiles(nationality);
CREATE INDEX idx_profiles_prefecture ON profiles(prefecture);
CREATE INDEX idx_profiles_membership_type ON profiles(membership_type);
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified);

CREATE INDEX idx_matches_user1_id ON matches(user1_id);
CREATE INDEX idx_matches_user2_id ON matches(user2_id);
CREATE INDEX idx_matches_status ON matches(status);

CREATE INDEX idx_experiences_date ON experiences(date);
CREATE INDEX idx_experiences_prefecture ON experiences(prefecture);
CREATE INDEX idx_experiences_category ON experiences(category);
CREATE INDEX idx_experiences_status ON experiences(status);
CREATE INDEX idx_experiences_organizer_id ON experiences(organizer_id);

CREATE INDEX idx_experience_participants_experience_id ON experience_participants(experience_id);
CREATE INDEX idx_experience_participants_user_id ON experience_participants(user_id);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Create functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_participants_updated_at BEFORE UPDATE ON experience_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update current_participants count
CREATE OR REPLACE FUNCTION update_experience_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE experiences 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.experience_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE experiences 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.experience_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes that affect participant count
    IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      UPDATE experiences 
      SET current_participants = current_participants - 1 
      WHERE id = NEW.experience_id;
    ELSIF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE experiences 
      SET current_participants = current_participants + 1 
      WHERE id = NEW.experience_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for participant count
CREATE TRIGGER update_experience_participants_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON experience_participants
  FOR EACH ROW EXECUTE FUNCTION update_experience_participants_count();

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Matches policies
CREATE POLICY "Users can view own matches" ON matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches" ON matches
  FOR INSERT WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update own matches" ON matches
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Experiences policies
CREATE POLICY "Users can view all experiences" ON experiences
  FOR SELECT USING (true);

CREATE POLICY "Users can create experiences" ON experiences
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update own experiences" ON experiences
  FOR UPDATE USING (auth.uid() = organizer_id);

-- Experience participants policies
CREATE POLICY "Users can view experience participants" ON experience_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join experiences" ON experience_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" ON experience_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own sent messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Create view for user matches with profile information
CREATE VIEW user_matches_with_profiles AS
SELECT 
  m.*,
  p1.first_name as user1_first_name,
  p1.last_name as user1_last_name,
  p1.avatar_url as user1_avatar_url,
  p2.first_name as user2_first_name,
  p2.last_name as user2_last_name,
  p2.avatar_url as user2_avatar_url
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id;