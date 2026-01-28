-- 🔒 RLSポリシー完全修正: profiles テーブル
-- 目的: 全ポリシーを TO authenticated + (user_id OR id) に統一
--
-- 問題: 旧ポリシーは auth.uid() = id のみ、roles が {public} 混在
-- 解決: SELECT含む全操作を user_id OR id で判定、roles を authenticated に統一
-- 適用日: 2026-01-29（Supabase production確認済み）

-- SELECT
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = id);

-- INSERT
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = id);

-- DELETE
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = id);
