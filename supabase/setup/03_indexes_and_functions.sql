-- ============================================
-- STEP 3: Indexes and Functions
-- ============================================

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