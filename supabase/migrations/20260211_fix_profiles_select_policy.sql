-- profiles SELECT ポリシー修正
-- 2026-02-11
-- 目的: 認証ユーザーが「初期化済み or 自分」のプロフィールを閲覧可能にする

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;

CREATE POLICY "profiles_select_initialized_or_own"
ON profiles FOR SELECT TO authenticated
USING (
  profile_initialized = true
  OR user_id = auth.uid()
  OR id = auth.uid()
);
