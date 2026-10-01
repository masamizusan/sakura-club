-- 段階2-A：公開用プロフィールビューと profiles の閲覧制限（本番 Supabase で 2026-09-30 実行済み・記録用）

-- ============================================================
-- ステップ1：公開用ビュー（完成済み・active・ブロック関係なし、表示用カラムのみ）
-- ============================================================
BEGIN;

CREATE VIEW public.profiles_public
WITH (security_barrier = true)
AS
SELECT
  p.id,
  p.name,
  CASE
    WHEN p.birth_date IS NOT NULL
      THEN date_part('year', age((now() AT TIME ZONE 'Asia/Tokyo')::date, p.birth_date))::int
    ELSE p.age
  END AS age,
  p.gender, p.nationality, p.residence, p.city,
  p.avatar_url, p.photo_urls, p.bio, p.interests,
  p.occupation, p.height, p.body_type, p.marital_status,
  p.personality_tags, p.culture_tags, p.language_skills,
  p.visit_schedule, p.travel_companion, p.planned_prefectures,
  p.is_verified, p.created_at, p.last_seen_at
FROM public.profiles p
WHERE p.profile_initialized = true
  AND p.status = 'active'
  AND NOT public.is_blocked_with(p.id);

REVOKE ALL ON public.profiles_public FROM public, anon;
GRANT SELECT ON public.profiles_public TO authenticated;

COMMIT;

-- ============================================================
-- ステップ3：profiles テーブルは本人の行のみ閲覧可（他人は profiles_public 経由）
-- ※ profiles_public は security_invoker なし（所有者権限）のため、この制限後も他人の公開用カラムを返す
-- ============================================================
BEGIN;

DROP POLICY profiles_select_all_authenticated ON public.profiles;
DROP POLICY profiles_select_conversation_partner ON public.profiles;
DROP POLICY profiles_select_initialized_or_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR auth.uid() = user_id);

REVOKE ALL ON public.profiles FROM anon;

COMMIT;
