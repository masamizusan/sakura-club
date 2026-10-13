-- stage11b: like_daily_limit をログインしていない人から呼べないようにする（#8 の続き）
-- 実行日: 2026-10-14
-- like_daily_limit() は「1 日のいいね上限 = 10」を返すだけの関数（トリガー用ではないため stage11 の対象外だった）。
-- 実害はないが、ログインしていない人が呼ぶ経路はないので外す。
-- RLS や他の関数から使われていても困らないよう、ログインした人（authenticated）には明示的に残す。

BEGIN;

REVOKE EXECUTE ON FUNCTION public.like_daily_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.like_daily_limit() TO authenticated;

COMMIT;

-- 確認（anon が false、authenticated が true なら OK）
SELECT has_function_privilege('anon', 'public.like_daily_limit()', 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', 'public.like_daily_limit()', 'EXECUTE') AS authenticated_can_execute;
