-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：profiles の表（列・制約・インデックス・ポリシー・トリガー・権限）と、関数 profiles_email_immutable・handle_new_user

BEGIN;

-- ============================================================
-- 表 public.profiles（001_initial_schema.sql の定義から大きく変わっているため、表まるごと）
-- ============================================================

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text,
  gender text,
  age integer,
  nationality text,
  residence text,
  interests text[],
  bio text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  avatar_url text,
  user_id uuid,
  last_name text,
  city text,
  email text,
  is_verified boolean DEFAULT false,
  membership_type text DEFAULT 'free'::text,
  birth_date date,
  visit_schedule text,
  travel_companion text,
  planned_prefectures text[],
  japanese_level text,
  english_level text,
  personality_tags text[],
  culture_tags text[],
  occupation text,
  height integer,
  body_type text,
  marital_status text,
  language_skills jsonb DEFAULT '[]'::jsonb,
  photo_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
  profile_initialized boolean DEFAULT false NOT NULL,
  verification_status text DEFAULT 'unverified'::text,
  verification_submitted_at timestamp with time zone,
  id_document_url text,
  id_document_type text,
  ai_review_result jsonb,
  ai_review_flags text[],
  status text DEFAULT 'active'::text NOT NULL,
  deleted_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  culture_wish text
);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT photo_urls_is_array CHECK ((jsonb_typeof(photo_urls) = 'array'::text));

ALTER TABLE public.profiles ADD CONSTRAINT photo_urls_max_3_images CHECK ((jsonb_array_length(photo_urls) <= 3));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_url_no_data_url CHECK (((avatar_url IS NULL) OR (avatar_url !~~ 'data:image/%'::text))) NOT VALID;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_culture_wish_length CHECK (((culture_wish IS NULL) OR (char_length(culture_wish) <= 200)));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_male_nationality_allowed CHECK (((gender IS DISTINCT FROM 'male'::text) OR (nationality IS NULL) OR (nationality = ANY (ARRAY['アメリカ'::text, 'イギリス'::text, 'カナダ'::text, 'オーストラリア'::text, 'ドイツ'::text, 'フランス'::text, 'イタリア'::text, 'スペイン'::text, 'オランダ'::text, 'スウェーデン'::text, 'ノルウェー'::text, 'デンマーク'::text, '韓国'::text, '台湾'::text, 'タイ'::text, 'シンガポール'::text, 'その他'::text]))));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'deleted_pending'::text, 'deleted_permanent'::text, 'suspended'::text])));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_profiles_age ON public.profiles USING btree (age);
CREATE INDEX idx_profiles_gender ON public.profiles USING btree (gender);
CREATE INDEX idx_profiles_language_skills_gin ON public.profiles USING gin (language_skills);
CREATE INDEX idx_profiles_residence ON public.profiles USING btree (residence);
CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);
CREATE UNIQUE INDEX profiles_user_id_unique ON public.profiles USING btree (user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() = user_id) OR (auth.uid() = id)));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO public
  USING ((((auth.uid() = user_id) OR (auth.uid() = id)) AND (status = 'active'::text)))
  WITH CHECK (((auth.uid() = user_id) OR (auth.uid() = id)));

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (((auth.uid() = id) OR (auth.uid() = user_id)));

CREATE TRIGGER profiles_photo_moderation_insert AFTER INSERT ON public.profiles FOR EACH ROW WHEN (((new.photo_urls IS NOT NULL) OR (new.avatar_url IS NOT NULL))) EXECUTE FUNCTION notify_profile_photo_moderation();

CREATE TRIGGER profiles_photo_moderation_update AFTER UPDATE OF photo_urls, avatar_url ON public.profiles FOR EACH ROW WHEN (((old.photo_urls IS DISTINCT FROM new.photo_urls) OR (old.avatar_url IS DISTINCT FROM new.avatar_url))) EXECUTE FUNCTION notify_profile_photo_moderation();

CREATE TRIGGER trg_profiles_email_immutable BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_email_immutable();

CREATE TRIGGER trg_profiles_protect_columns BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_protect_columns();

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

-- ============================================================
-- 関数（作成 SQL がリポジトリに無かったもの）
-- ============================================================

CREATE OR REPLACE FUNCTION public.profiles_email_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.email is distinct from old.email then
    raise exception 'profiles.email is immutable';
  end if;
  return new;
end;
$function$;
-- 実行の権限（元データ 7）：anon=false, authenticated=false
REVOKE ALL ON FUNCTION public.profiles_email_immutable() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.profiles_email_immutable() FROM authenticated;
-- PUBLIC・service_role の権限は元データに無い（不明）

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', ''));
    RETURN NEW;
  END;
  $function$;
-- 実行の権限（元データ 7）：anon=false, authenticated=false
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
-- PUBLIC・service_role の権限は元データに無い（不明）
-- handle_new_user を呼ぶ auth.users 側のトリガー（取得日 2026-11-17。tgenabled = 'O'＝有効）
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ROLLBACK;
