-- #5 テストアカウントと不要ファイルの調査（読み取り専用。SELECT だけ）
-- Supabase SQL Editor で、ブロックごとに実行してください。BEGIN / DELETE / UPDATE は含みません。
--
-- 残すアカウント（KEEP）は先頭の keep CTE に完全な UUID を入れてください（前方一致でも可）。
-- 例では前方 8 桁だけ書いてあります。

-- ============================================================
-- 0) スキーマ確認（スキーマ検証ルール）
-- ============================================================
-- 0-1) auth.users・profiles の使う列が実在するか
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_schema = 'auth' AND table_name = 'users'
       AND column_name IN ('id','email','is_anonymous','created_at','last_sign_in_at'))
   OR (table_schema = 'public' AND table_name = 'profiles'
       AND column_name IN ('id','user_id','name','email','gender','nationality','residence',
                           'avatar_url','photo_urls','profile_image','id_document_url','created_at','status'))
ORDER BY table_schema, table_name, column_name;

-- 0-2) auth.users / profiles / messages / conversations を参照している外部キーと ON DELETE の動き
--      （ダッシュボードで作ったテーブルもここで全部出る。confdeltype: c=CASCADE n=SET NULL a=NO ACTION r=RESTRICT d=SET DEFAULT）
SELECT
  con.conrelid::regclass                 AS child_table,
  con.confrelid::regclass                AS parent_table,
  pg_get_constraintdef(con.oid)          AS definition,
  CASE con.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION（消せない）'
                       WHEN 'r' THEN 'RESTRICT（消せない）' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass,
                        'public.messages'::regclass, 'public.conversations'::regclass,
                        'public.experiences'::regclass)
ORDER BY parent_table::text, child_table::text;

-- ============================================================
-- 1) アカウントの分類（a〜d）
-- ============================================================
WITH keep(prefix) AS (
  VALUES ('9c645969'), ('31cb1dc9'), ('8f01da3c'),
         ('2b6f201e-aebb-4c8c-9ee2-e1c2a96c8302'),
         ('f1ca609d-5cab-484c-a6b1-cd08e97d00f5'),
         ('668e8e6c-0bb6-4c6e-a22c-4dc84e3cd559'),
         ('840984dd-da94-4b9b-bdc2-a5c87267e90c'),
         ('cb397188-da66-4e2e-8f5f-05687a996d5f'),
         ('570b1fbb-8630-421f-a24a-9b900114a754'),
         ('7199e941-e60a-4430-b771-ac80a4fde904'),
         ('fee46b32-c950-426f-b6d0-6b866183085b'),
         ('d282870c-dfdb-4fef-be23-a20afa8d3615')
),
u AS (
  SELECT au.id, au.email, au.is_anonymous, au.created_at, au.last_sign_in_at,
         p.id AS profile_id, p.name, p.gender, p.nationality
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
),
rel AS (
  SELECT u.id,
    (SELECT count(*) FROM public.conversations c WHERE c.user1_id = u.id OR c.user2_id = u.id) AS conversations,
    (SELECT count(*) FROM public.messages m WHERE m.sender_id = u.id
       OR m.conversation_id IN (SELECT c.id FROM public.conversations c WHERE c.user1_id = u.id OR c.user2_id = u.id)) AS messages,
    (SELECT count(*) FROM public.likes l WHERE l.liker_id = u.id OR l.liked_user_id = u.id)    AS likes,
    (SELECT count(*) FROM public.matches mt WHERE (mt.user1_id = u.id OR mt.user2_id = u.id) AND mt.status = 'matched') AS matches,
    (SELECT count(*) FROM public.subscriptions s WHERE s.user_id = u.id)                        AS subscriptions,
    (SELECT count(*) FROM public.subscriptions s WHERE s.user_id = u.id AND s.status = 'active') AS active_subs,
    (SELECT count(*) FROM public.sakura_ticket_purchases t WHERE t.user_id = u.id)               AS ticket_purchases,
    (SELECT count(*) FROM public.stripe_customers sc WHERE sc.user_id = u.id)                    AS stripe_customers,
    (SELECT count(*) FROM storage.objects o
       WHERE o.bucket_id IN ('avatars','identity-documents','avatars-quarantine')
         AND o.name LIKE u.id::text || '/%')                                                    AS own_files
  FROM u
),
classified AS (
  SELECT u.*, rel.conversations, rel.messages, rel.likes, rel.matches, rel.subscriptions,
         rel.active_subs, rel.ticket_purchases, rel.stripe_customers, rel.own_files,
         EXISTS (SELECT 1 FROM keep k WHERE u.id::text LIKE k.prefix || '%') AS is_keep,
         CASE
           WHEN u.is_anonymous THEN 'a_匿名'
           WHEN u.profile_id IS NULL THEN 'b_profiles無し'
           WHEN coalesce(trim(u.name),'') = '' OR coalesce(trim(u.email),'') = ''
             OR (coalesce(trim(u.gender),'') = '' AND coalesce(trim(u.nationality),'') = '') THEN 'c_不完全'
           ELSE 'd_通常'
         END AS category
  FROM u JOIN rel ON rel.id = u.id
)
-- 1-1) 件数（分類 × 残す/候補）
SELECT category, is_keep, count(*) AS users,
       sum((conversations + messages + likes + matches > 0)::int) AS with_activity,
       sum((subscriptions + ticket_purchases + stripe_customers > 0)::int) AS with_billing
FROM classified GROUP BY category, is_keep ORDER BY category, is_keep;
-- 1-2) 一覧が欲しいときは、上の最後の SELECT を次に差し替えて実行
-- SELECT category, is_keep, id, name, email, gender, nationality, created_at, last_sign_in_at,
--        conversations, messages, likes, matches, subscriptions, active_subs, ticket_purchases, stripe_customers, own_files
-- FROM classified ORDER BY category, is_keep DESC, created_at;

-- 1-3) profiles はあるが auth.users が無い（逆向きの孤児。CASCADE なら 0 のはず）
SELECT p.id, p.name, p.created_at
FROM public.profiles p LEFT JOIN auth.users au ON au.id = p.id
WHERE au.id IS NULL;

-- ============================================================
-- 2) 使われていない Storage のファイル
-- ============================================================
-- 2-0) バケットごとの総数
SELECT bucket_id, count(*) AS files, pg_size_pretty(sum((metadata->>'size')::bigint)) AS size
FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;

-- 2-1) avatars：photo_urls・avatar_url（・profile_image）から参照されていないファイル
WITH refs AS (
  SELECT regexp_replace(split_part(url, '?', 1), '^.*/storage/v1/object/public/avatars/', '') AS name
  FROM (
    SELECT jsonb_array_elements_text(coalesce(photo_urls, '[]'::jsonb)) AS url FROM public.profiles
    UNION ALL SELECT avatar_url FROM public.profiles WHERE avatar_url IS NOT NULL
  ) x
)
SELECT o.name, o.created_at, (o.metadata->>'size')::bigint AS bytes,
       EXISTS (SELECT 1 FROM auth.users au WHERE o.name LIKE au.id::text || '/%') AS owner_exists
FROM storage.objects o
WHERE o.bucket_id = 'avatars'
  AND o.name NOT IN (SELECT name FROM refs WHERE name IS NOT NULL)
ORDER BY owner_exists, o.created_at;
-- 件数だけ：上の SELECT を SELECT count(*), sum((NOT owner_exists)::int) ... に変えるか、結果行数を見る

-- 2-2) identity-documents：id_document_url から参照されていないファイル
--      （id_document_url はパス「{userId}/{時刻}.jpg」。古い行は公開 URL 形式の可能性あり）
WITH refs AS (
  SELECT regexp_replace(split_part(id_document_url, '?', 1), '^.*/identity-documents/', '') AS name
  FROM public.profiles WHERE id_document_url IS NOT NULL
)
SELECT o.name, o.created_at,
       EXISTS (SELECT 1 FROM auth.users au WHERE o.name LIKE au.id::text || '/%') AS owner_exists
FROM storage.objects o
WHERE o.bucket_id = 'identity-documents'
  AND o.name NOT IN (SELECT name FROM refs)
ORDER BY owner_exists, o.created_at;

-- 2-3) chat-images：messages.image_url から参照されていないファイル
--      （パスは「{conversationId}/{uuid}.ext」。会話が消えているかも出す）
WITH refs AS (
  SELECT regexp_replace(split_part(image_url, '?', 1), '^.*/storage/v1/object/public/chat-images/', '') AS name
  FROM public.messages WHERE image_url IS NOT NULL AND image_url <> ''
)
SELECT o.name, o.created_at,
       EXISTS (SELECT 1 FROM public.conversations c WHERE o.name LIKE c.id::text || '/%') AS conversation_exists
FROM storage.objects o
WHERE o.bucket_id = 'chat-images'
  AND o.name NOT IN (SELECT name FROM refs)
ORDER BY conversation_exists, o.created_at;

-- 2-4) 隔離用バケットの中身と、記録（flags）との対応
SELECT o.bucket_id, o.name, o.created_at,
       (SELECT count(*) FROM public.profile_photo_flags f WHERE f.photo_path = o.name) AS profile_flags
FROM storage.objects o
WHERE o.bucket_id IN ('avatars-quarantine', 'chat-images-quarantine')
ORDER BY o.bucket_id, o.created_at;
-- chat-images-quarantine の記録は message_flags（列名を 0-1 と同じ方法で確認してから突き合わせ）

-- 2-5) 直接 DELETE を止めるトリガーがあるか（あれば storage.objects への DELETE はエラーになる）
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'storage.objects'::regclass AND NOT tgisinternal;

-- ============================================================
-- 3) 今ある写真（一括審査の対象数）
-- ============================================================
SELECT count(*) AS profiles_with_photos,
       sum(coalesce(jsonb_array_length(photo_urls), 0)) AS photo_urls_total
FROM public.profiles
WHERE photo_urls IS NOT NULL OR avatar_url IS NOT NULL;
