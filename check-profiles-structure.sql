-- profilesテーブルの構造を確認

-- 1. profilesテーブルのカラム一覧を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. 既存のprofilesデータを確認
SELECT * FROM profiles LIMIT 1;