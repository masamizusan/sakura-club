-- stage10: profiles_public（公開プロフィールのビュー）を読み取り専用にする（#8 の一部・優先）
-- 実行日: 2026-10-14
-- 背景: profiles_public は「自動で書き込みもできるビュー」（is_updatable = YES）で、
--       security_invoker が付いていない（ビューの持ち主の権限で動く）。
--       そのうえ authenticated に INSERT・UPDATE・DELETE・TRUNCATE が付いていたため、
--       ビュー越しに書き込むと、profiles の RLS（本人だけ更新可）を通らずに
--       他人のプロフィールを書き換えられる可能性があった。
-- 対応: ログインした人・していない人とも、このビューへの書き込み系の権限を外す。
--       読み取り（SELECT）は残す（プロフィール一覧・詳細の表示に使うため）。
--       security_invoker は付けない（付けると他人のプロフィールが見えなくなるため）。

BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.profiles_public FROM anon, authenticated;

COMMIT;

-- 確認（authenticated が SELECT だけになっていれば OK）
SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'profiles_public'
  AND grantee IN ('anon', 'authenticated')
GROUP BY grantee;
