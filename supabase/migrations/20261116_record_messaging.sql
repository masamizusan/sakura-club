-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：conversations・messages・message_translations の表（列・制約・インデックス・ポリシー・トリガー・権限）
-- 注意：トリガー moderate_chat_image の x-webhook-secret は伏せ字のまま。本物の値はここに書かない

BEGIN;

-- ============================================================
-- 表 public.conversations
-- ============================================================

CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_message text,
  last_message_at timestamp with time zone,
  user_pair_key text,
  is_seen_user1 boolean DEFAULT false,
  is_seen_user2 boolean DEFAULT false
);

ALTER TABLE public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);

ALTER TABLE public.conversations ADD CONSTRAINT conversations_user1_id_user2_id_key UNIQUE (user1_id, user2_id);

ALTER TABLE public.conversations ADD CONSTRAINT conversations_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.conversations ADD CONSTRAINT conversations_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX conversations_user_pair_key_unique ON public.conversations USING btree (user_pair_key);
CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_seen_user1 ON public.conversations USING btree (user1_id, is_seen_user1);
CREATE INDEX idx_conversations_seen_user2 ON public.conversations USING btree (user2_id, is_seen_user2);
CREATE INDEX idx_conversations_updated_at ON public.conversations USING btree (updated_at);
CREATE INDEX idx_conversations_user1_id ON public.conversations USING btree (user1_id);
CREATE INDEX idx_conversations_user2_id ON public.conversations USING btree (user2_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "conversations_select_participant" ON public.conversations
  FOR SELECT TO authenticated
  USING (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT ON public.conversations TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

-- ============================================================
-- 表 public.messages（001_initial_schema.sql の定義から変わっているため、表まるごと）
-- ============================================================

CREATE TABLE public.messages (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text,
  translated_content text,
  translated_lang text,
  client_message_id uuid
);

ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE public.messages ADD CONSTRAINT messages_translated_lang_check CHECK (((translated_lang IS NULL) OR (translated_lang = ANY (ARRAY['ja'::text, 'en'::text, 'ko'::text, 'zh-tw'::text]))));

ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_messages_conversation_created ON public.messages USING btree (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);
CREATE INDEX idx_messages_unread_by_conversation ON public.messages USING btree (conversation_id) WHERE (is_read = false);
CREATE UNIQUE INDEX messages_sender_client_message_id_key ON public.messages USING btree (sender_id, client_message_id) WHERE (client_message_id IS NOT NULL);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.status = 'active'::text) AND (p.verification_status = 'approved'::text)))) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.gender = 'female'::text)))) OR (EXISTS ( SELECT 1
   FROM subscriptions s
  WHERE ((s.user_id = auth.uid()) AND (s.status = 'active'::text))))) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((auth.uid() = c.user1_id) OR (auth.uid() = c.user2_id)) AND (NOT is_blocked_with(
        CASE
            WHEN (c.user1_id = auth.uid()) THEN c.user2_id
            ELSE c.user1_id
        END)))))));

CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((auth.uid() = c.user1_id) OR (auth.uid() = c.user2_id))))));

CREATE POLICY "messages_update_read_status" ON public.messages
  FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((auth.uid() = c.user1_id) OR (auth.uid() = c.user2_id)) AND (auth.uid() <> messages.sender_id)))));

CREATE TRIGGER moderate_chat_image AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://sakura-club.vercel.app/api/internal/moderate-chat-image', 'POST', '{"Content-type":"application/json","x-webhook-secret":"<CHAT_IMAGE_MODERATION_SECRET・伏せ字>"}', '{}', '5000');

CREATE TRIGGER trigger_update_conversation_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

GRANT INSERT, SELECT ON public.messages TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

-- 列ごとの権限（元データ 5b②）：受け取った人が書き換えられるのは既読の 2 列だけ
GRANT UPDATE (is_read, read_at) ON public.messages TO authenticated;

-- ============================================================
-- 表 public.message_translations
-- ============================================================

CREATE TABLE public.message_translations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  message_id uuid NOT NULL,
  language text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.message_translations ADD CONSTRAINT message_translations_pkey PRIMARY KEY (id);

ALTER TABLE public.message_translations ADD CONSTRAINT message_translations_message_id_language_key UNIQUE (message_id, language);

CREATE INDEX idx_message_translations_lookup ON public.message_translations USING btree (message_id, language);

ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "message_translations_select_participant" ON public.message_translations
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversations c ON ((c.id = m.conversation_id)))
  WHERE ((m.id = message_translations.message_id) AND ((auth.uid() = c.user1_id) OR (auth.uid() = c.user2_id))))));

GRANT SELECT ON public.message_translations TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

ROLLBACK;
