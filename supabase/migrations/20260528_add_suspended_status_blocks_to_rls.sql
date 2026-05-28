-- ===============================================================
-- 指示書 #31 Phase 3: profiles.status='active' チェックを 7 ポリシーに追加
-- ===============================================================
-- 目的: memory #1 の 2 層防御原則を profiles.status='suspended' に完全適用
-- 着手前提: 2026/05/28 取得の本番ポリシー定義(指示書 #31 Phase 3-1 で再確認済)
-- 実行方法: BEGIN → DROP/CREATE 7 ポリシー → 検証 SELECT → 結果を見て COMMIT or ROLLBACK
--
-- 注意:
--   - マイグレーション側の旧ポリシー名(例: messages_insert_verified_participant)は
--     本番に存在しないため触らない。本番ポリシー名で DROP → CREATE する
--   - footprints / profiles のポリシー名にはスペース・大文字を含むためダブルクォート必須
--   - Phase 2 で API レイヤーにも requireActiveProfile() ガードを追加済(2 層防御)
-- ===============================================================

BEGIN;

-- ---------------------------------------------------------------
-- Policy 1/7: messages.messages_insert_participant (INSERT)
-- 既存条件: sender_id 一致 + verification_status='approved' + (女性 OR 課金中)
-- 追加: AND profiles.status='active'
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
CREATE POLICY messages_insert_participant ON public.messages
  FOR INSERT
  WITH CHECK (
    (auth.uid() = sender_id)
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.verification_status = 'approved'
    ))
    AND (
      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.gender = 'female'))
      OR (EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.user_id = auth.uid() AND subscriptions.status = 'active'))
    )
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.status = 'active'
    ))
  );

-- ---------------------------------------------------------------
-- Policy 2/7: likes.likes_insert_own (INSERT)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS likes_insert_own ON public.likes;
CREATE POLICY likes_insert_own ON public.likes
  FOR INSERT
  WITH CHECK (
    (auth.uid() = liker_id)
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.status = 'active'
    ))
  );

-- ---------------------------------------------------------------
-- Policy 3/7: footprints."Authenticated users can insert footprints" (INSERT)
-- 注意: ポリシー名にスペース・大文字を含むため、必ずダブルクォートで囲む
-- 最高優先(本ポリシーが唯一の防御線。
-- footprints の INSERT は profile/[id]/page.tsx:454 の anon 直接経路のみ、API ルート無し)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert footprints" ON public.footprints;
CREATE POLICY "Authenticated users can insert footprints" ON public.footprints
  FOR INSERT
  WITH CHECK (
    (auth.uid() = visitor_id)
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.status = 'active'
    ))
  );

-- ---------------------------------------------------------------
-- Policy 4/7: conversations.conversations_insert_participant (INSERT)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS conversations_insert_participant ON public.conversations;
CREATE POLICY conversations_insert_participant ON public.conversations
  FOR INSERT
  WITH CHECK (
    ((auth.uid() = user1_id) OR (auth.uid() = user2_id))
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.status = 'active'
    ))
  );

-- ---------------------------------------------------------------
-- Policy 5/7: blocks.users_manage_own_blocks (ALL)
-- ALL の場合は USING と WITH CHECK の両方に追加
-- 既存 with_check は null だが、ALL ポリシーは INSERT/UPDATE 時に WITH CHECK を要求するため明示
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS users_manage_own_blocks ON public.blocks;
CREATE POLICY users_manage_own_blocks ON public.blocks
  FOR ALL
  USING (
    (auth.uid() = blocker_id)
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.status = 'active'
    ))
  )
  WITH CHECK (
    (auth.uid() = blocker_id)
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.status = 'active'
    ))
  );

-- ---------------------------------------------------------------
-- Policy 6/7: reports.users_create_reports (INSERT)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS users_create_reports ON public.reports;
CREATE POLICY users_create_reports ON public.reports
  FOR INSERT
  WITH CHECK (
    (auth.uid() = reporter_id)
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.status = 'active'
    ))
  );

-- ---------------------------------------------------------------
-- Policy 7/7: profiles."Users can update own profile" (UPDATE)
-- 注意: ポリシー名にスペース・大文字を含むため、必ずダブルクォートで囲む
-- 設計判断: USING にのみ AND status='active' 追加(Phase 0 案 A 確定)
--   - 既存 active ユーザー: 通過(status='active' 一致)
--   - suspended ユーザー: USING で fail → 自己 UPDATE 不可
--   - WITH CHECK は不変(active→deleted_pending 遷移等は service_role 経由のみで発生、
--     /api/auth/leave は service_role で物理削除モデル)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (
    ((auth.uid() = user_id) OR (auth.uid() = id))
    AND (status = 'active')
  )
  WITH CHECK (
    (auth.uid() = user_id) OR (auth.uid() = id)
  );

-- ===============================================================
-- 検証 SELECT (改良版 - 偽陽性排除)
-- ===============================================================
-- 全 7 ポリシーが期待通り更新されたかを確認
--
-- 各列の意味:
--   has_profiles_status_check: 'profiles.status' プレフィックス付きで条件式に含まれるか
--     → 6 件 (blocks/conversations/footprints/likes/messages/reports) で true 期待
--   has_status_in_using:       USING 句に status が含まれるか
--     → blocks (ALL) と profiles (UPDATE) で true 期待
--   has_status_in_with_check:  WITH CHECK 句に status が含まれるか
--     → blocks/conversations/footprints/likes/messages/reports で true 期待
--
-- ⚠️ 旧版検証クエリの欠陥(Phase 3-3 で判明):
--   `OR with_check LIKE '%status%'` だけだと messages の既存
--   subscription.status = 'active' 条件で偽陽性が出る
--   → 必ず `profiles.status` プレフィックスで判定すること
SELECT tablename, policyname, cmd,
       (qual LIKE '%profiles.status%' OR with_check LIKE '%profiles.status%') AS has_profiles_status_check,
       (qual LIKE '%status%') AS has_status_in_using,
       (with_check LIKE '%status%') AS has_status_in_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'messages' AND policyname = 'messages_insert_participant')
    OR (tablename = 'likes' AND policyname = 'likes_insert_own')
    OR (tablename = 'footprints' AND policyname = 'Authenticated users can insert footprints')
    OR (tablename = 'conversations' AND policyname = 'conversations_insert_participant')
    OR (tablename = 'blocks' AND policyname = 'users_manage_own_blocks')
    OR (tablename = 'reports' AND policyname = 'users_create_reports')
    OR (tablename = 'profiles' AND policyname = 'Users can update own profile')
  )
ORDER BY tablename, cmd, policyname;

-- ===============================================================
-- 自己完結トランザクション: 明示的 COMMIT
-- ===============================================================
-- ⚠️ Phase 3-3 教訓:
--   Supabase SQL Editor は BEGIN; を含むスクリプトで明示的 COMMIT; が無いと
--   クエリ実行終了時に自動 ROLLBACK される(別セッション扱い)
--   COMMIT; をコメント化したままだと、DROP/CREATE は反映されない
--
-- 万一検証 SELECT で異常が見つかった場合は、本ファイル全文を実行する前に
-- COMMIT; 行を ROLLBACK; に書き換えてから実行すること
COMMIT;
