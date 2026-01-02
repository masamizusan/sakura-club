-- ====================================================
-- Sakura Club: profiles.user_id 紐付け修正マイグレーション
-- 目的: profiles と auth.uid の確実な 1:1 紐付けを実現
-- ====================================================

-- 1. profiles.user_id カラム追加（存在しない場合）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2. user_id のユニークインデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique 
ON public.profiles(user_id);

-- 3. 外部キー制約追加（オプション - RLSに合わせて調整）
-- ALTER TABLE public.profiles 
-- ADD CONSTRAINT profiles_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) 
-- ON DELETE CASCADE;

-- 4. 既存データ確認用クエリ（実行後に確認）
-- SELECT id, user_id, created_at, name, email 
-- FROM public.profiles 
-- WHERE user_id IS NOT NULL 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- ====================================================
-- 注意：このSQLをSupabase SQL Editorで実行してください
-- 実行後、profiles テーブルに user_id カラムが追加されます
-- ====================================================