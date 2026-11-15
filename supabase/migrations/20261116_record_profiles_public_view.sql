-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：ビュー profiles_public の今の定義と権限

BEGIN;

-- ============================================================
-- ビュー public.profiles_public（20260930_stage2a_profiles_public_view.sql の定義に culture_wish が加わった今の形）
-- view_options（security_invoker・security_barrier など）：元データでは null
-- ============================================================

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, name,
  CASE WHEN birth_date IS NOT NULL THEN date_part('year'::text, age((now() AT TIME ZONE 'Asia/Tokyo'::text)::date::timestamp with time zone, birth_date::timestamp with time zone))::integer ELSE age END AS age,
  gender, nationality, residence, city, avatar_url, photo_urls, bio, interests, occupation, height, body_type, marital_status,
  personality_tags, culture_tags, language_skills, visit_schedule, travel_companion, planned_prefectures, is_verified, created_at, last_seen_at, culture_wish
FROM profiles p
WHERE profile_initialized = true AND status = 'active'::text AND NOT is_blocked_with(id);

-- 権限（元データ 5b①）：authenticated は SELECT だけ。anon はなし
GRANT SELECT ON public.profiles_public TO authenticated;
-- service_role の権限：元データに無い（不明）

ROLLBACK;
