-- stage12: messages に「translated_content が何語の訳か」を保存する列を追加（#15 第1段階）
-- 既存の行は NULL のまま（NULL = 旧仕様の訳：女性の送信は英語、男性の送信は日本語）
-- 列の追加はテーブルの既存の権限・RLS をそのまま引き継ぐ（新しい GRANT は不要）

BEGIN;

ALTER TABLE public.messages
  ADD COLUMN translated_lang text
  CONSTRAINT messages_translated_lang_check
  CHECK (translated_lang IS NULL OR translated_lang IN ('ja', 'en', 'ko', 'zh-tw'));

COMMENT ON COLUMN public.messages.translated_lang IS
  'translated_content の言語（ja/en/ko/zh-tw）。NULL は stage12 以前の旧仕様の訳';

COMMIT;
