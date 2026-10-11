-- stage6: 体験機能の公開まで、利用者による体験の作成・参加の書き込みを止める
-- 実行日: 2026-10-11
-- 背景: 一覧は準備中表示だが、RLS 上はログインしていれば誰でも
--       experiences を作成でき、experience_participants に参加行を追加できた。
-- 本番の確認結果（実行前）:
--   experiences             : INSERT "Users can create experiences" / SELECT "Users can view all experiences"
--   experience_participants : INSERT "Users can join experiences" / SELECT experience_participants_select_authenticated
--   UPDATE・DELETE のポリシーはどちらにもなし。RLS は両方とも有効。
-- 実行後: 利用者の鍵では書き込み不可。書き込みは service_role（サーバー側）のみ。
-- 公開時: 誰が作成・参加できるかを決めてから、新しいポリシーを作り直す。

BEGIN;

DROP POLICY IF EXISTS "Users can create experiences" ON public.experiences;
DROP POLICY IF EXISTS "Users can join experiences" ON public.experience_participants;

COMMIT;

-- 確認（SELECT の 2 行だけが残っていれば OK）
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('experiences', 'experience_participants')
ORDER BY tablename, cmd;
