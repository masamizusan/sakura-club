-- stage13: メッセージの二重保存を防ぐ（#25）
-- 送る側が付ける一意の ID（client_message_id）を保存し、同じ送信者・同じ ID は 1 件だけにする
-- 既存の行は NULL のまま（部分 UNIQUE インデックスなので NULL は対象外）
-- 列の追加はテーブルの既存の権限・RLS をそのまま引き継ぐ

BEGIN;

ALTER TABLE public.messages
  ADD COLUMN client_message_id uuid;

CREATE UNIQUE INDEX messages_sender_client_message_id_key
  ON public.messages (sender_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

COMMENT ON COLUMN public.messages.client_message_id IS
  '送信側が付ける一意の ID。通信が切れた後の再送で二重保存しないためのもの（#25）。NULL は stage13 以前の行';

COMMIT;
