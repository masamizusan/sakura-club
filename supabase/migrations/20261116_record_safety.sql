-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：blocks・footprints・reports・message_flags の表（列・制約・インデックス・ポリシー・権限）

BEGIN;

-- ============================================================
-- 表 public.blocks
-- ============================================================

CREATE TABLE public.blocks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  blocker_id uuid,
  blocked_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.blocks ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);

ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);

ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "users_manage_own_blocks" ON public.blocks
  FOR ALL TO public
  USING (((auth.uid() = blocker_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.status = 'active'::text))))))
  WITH CHECK (((auth.uid() = blocker_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.status = 'active'::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.blocks TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

-- ============================================================
-- 表 public.footprints
-- ============================================================

CREATE TABLE public.footprints (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_owner_id uuid,
  visitor_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  is_read boolean DEFAULT false
);

ALTER TABLE public.footprints ADD CONSTRAINT footprints_pkey PRIMARY KEY (id);

ALTER TABLE public.footprints ADD CONSTRAINT footprints_profile_owner_id_fkey FOREIGN KEY (profile_owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.footprints ADD CONSTRAINT footprints_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_footprints_created_at ON public.footprints USING btree (created_at DESC);
CREATE INDEX idx_footprints_profile_owner_id ON public.footprints USING btree (profile_owner_id);

ALTER TABLE public.footprints ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "Authenticated users can insert footprints" ON public.footprints
  FOR INSERT TO public
  WITH CHECK (((auth.uid() = visitor_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.status = 'active'::text))))));

CREATE POLICY "footprints_select_own" ON public.footprints
  FOR SELECT TO authenticated
  USING ((auth.uid() = profile_owner_id));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.footprints TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

-- ============================================================
-- 表 public.reports
-- ============================================================

CREATE TABLE public.reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reporter_id uuid,
  reported_id uuid,
  reason text NOT NULL,
  detail text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reports ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE public.reports ADD CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "users_create_reports" ON public.reports
  FOR INSERT TO public
  WITH CHECK (((auth.uid() = reporter_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.status = 'active'::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.reports TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

-- ============================================================
-- 表 public.message_flags
-- ============================================================

CREATE TABLE public.message_flags (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  message_id uuid,
  flag_type text NOT NULL,
  score numeric,
  detail text,
  reviewed boolean DEFAULT false,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.message_flags ADD CONSTRAINT message_flags_pkey PRIMARY KEY (id);

ALTER TABLE public.message_flags ADD CONSTRAINT message_flags_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_flags ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "service_role_manage_flags" ON public.message_flags
  FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.message_flags TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

ROLLBACK;
