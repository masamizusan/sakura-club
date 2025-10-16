-- プロフィールテーブルにオンライン状態管理カラム追加
-- 実行日: 2025-10-16

-- オンライン状態と最終ログイン時刻のカラムを追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- インデックス追加（オンライン状態の検索を高速化）
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- 既存レコードのオンライン状態を初期化
UPDATE profiles SET is_online = FALSE WHERE is_online IS NULL;
UPDATE profiles SET last_seen = NOW() WHERE last_seen IS NULL;

-- 確認
SELECT 
  id,
  name || ' ' || last_name as full_name,
  is_online,
  last_seen
FROM profiles 
ORDER BY last_seen DESC
LIMIT 10;