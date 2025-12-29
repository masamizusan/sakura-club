-- RLS一時検証テスト（管理者権限が必要）
-- 注意: 本番環境では絶対に実行しないでください

-- 1. 現在のRLS状態を保存
-- (上記のcheck-rls-policies.sqlで確認済みの前提)

-- 2. RLSを一時的にOFF（検証のみ）
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. テスト後にRLSを再度ON（必須）
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. 特定ユーザーの現在のデータ確認（テスト用）
SELECT id, name, personality_tags, culture_tags, updated_at
FROM public.profiles 
WHERE id = 'あなたのuser_id'  -- 実際のuser_idに置換
LIMIT 1;