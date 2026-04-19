-- ============================================================
-- messages INSERT ポリシー強化
-- 年齢認証（全ユーザー）+ 課金チェック（外国人男性のみ）
--
-- 実行方法: Supabase Dashboard > SQL Editor に貼り付けて実行
-- または: npx supabase db push
-- ============================================================

-- 既存の INSERT ポリシーを全て削除（名前が不明なため安全に全消し）
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'messages'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
  END LOOP;
END $$;

-- 新しい INSERT ポリシー（年齢認証 + 課金チェック）
CREATE POLICY "messages_insert_verified_participant"
ON public.messages FOR INSERT
WITH CHECK (
  -- 自分が送信者であること
  auth.uid() = sender_id

  AND

  -- 年齢認証チェック（全ユーザー必須）
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND verification_status = 'approved'
  )

  AND

  -- 外国人男性は課金チェック（日本人女性はスキップ）
  (
    -- 日本人女性（gender='female'で判定）は無条件OK
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND gender = 'female'
    )
    OR
    -- 外国人男性はアクティブなサブスクリプション必須
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  )
);

-- 確認
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'messages' AND cmd = 'INSERT';
