-- stage11: 使わない権限の回収（#8）
-- 実行日: 2026-10-14
-- 前提（確認済み）:
--   ・public の全テーブルで RLS は有効
--   ・ログインしていない状態でテーブルを読むのは体験の GET API（experiences の SELECT）だけ
--   ・新規登録の途中（セッションなし）にアプリがテーブルへ書き込む処理はない
--   ・profiles_public は stage10 で読み取り専用にした
-- 方針:
--   anon（未ログイン）    : experiences の SELECT だけ残し、ほかのテーブル・ビュー・シーケンスの権限はすべて外す
--   authenticated（ログイン済み）: 読み書き（SELECT/INSERT/UPDATE/DELETE）は残す（RLS が行ごとに守る）。
--                          使わない TRUNCATE（全消し）・REFERENCES・TRIGGER だけ外す
--   トリガー用の関数       : 利用者側のロールから実行権限を外す（トリガーとして動くときは影響なし）
--   今後作るもの           : テーブル・シーケンスは anon に自動で権限が付かないようにする。
--                          関数は PUBLIC に自動で実行権限が付かないようにする
--                          （新しい RPC は authenticated へ GRANT EXECUTE を明示する決まりにする）

BEGIN;

-- 1. anon：全部外してから、experiences の SELECT だけ戻す
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT SELECT ON public.experiences TO anon;

-- 2. authenticated：使わない強い権限だけ外す
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 3. トリガー用の関数：利用者側のロールから実行権限を外す
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 4. 今後作るもの
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;

-- 確認（3 行が出る）
--   anon_table_grants      → experiences:SELECT だけ
--   authenticated_strong   → 0
--   anon_exec_functions    → 空（null）。何か出た場合はその関数名を報告
SELECT 'anon_table_grants' AS item,
       string_agg(DISTINCT table_name || ':' || privilege_type, ', ') AS result
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee = 'anon'
UNION ALL
SELECT 'authenticated_strong',
       count(*)::text
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee = 'authenticated'
  AND privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER')
UNION ALL
SELECT 'anon_exec_functions',
       string_agg(p.proname, ', ')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND has_function_privilege('anon', p.oid, 'EXECUTE');
