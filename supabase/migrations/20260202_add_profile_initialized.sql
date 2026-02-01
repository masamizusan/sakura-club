-- 指標A: profile_initialized カラム追加
-- ログイン後の遷移制御に使用（プロフィール未完成ユーザーを編集画面へ誘導）

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_initialized boolean NOT NULL DEFAULT false;

-- バックフィル: name と bio が入っているユーザーは初期化済みとみなす
UPDATE public.profiles
  SET profile_initialized = true
  WHERE bio IS NOT NULL AND bio != ''
    AND name IS NOT NULL AND name != '';
