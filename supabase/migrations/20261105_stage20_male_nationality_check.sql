-- stage20：男性の国籍を NATIONALITY_OPTIONS の 17 個（と空）だけにする CHECK（C9）
--
-- 17 個は src/utils/nationalityNormalize.ts の NATIONALITY_OPTIONS の dbValue を一字一句そのまま写したもの。
-- NATIONALITY_OPTIONS を変えるときは、この CHECK（profiles_male_nationality_allowed）も同じ値に作り直すこと。
-- 空（NULL）は許す（登録直後の行・おかしな国籍を書かなかった行のため。編集画面で本人に選ばせる）。
--
-- 実行：C9 の push の後、SQL Editor で 0 → 1 → 2 → 3 を 1 本ずつ実行する。
--       0 が 0 行でなければ 1 に進まず、結果を共有する（1 は NOT VALID なので既存の行は確かめないが、2 で失敗する）。

-- ========== 0. 該当者の確認（男性で nationality が NULL でなく 17 個以外の行。0 行であること） ==========
SELECT id, nationality, profile_initialized
FROM public.profiles
WHERE gender = 'male'
  AND nationality IS NOT NULL
  AND nationality NOT IN (
    'アメリカ', 'イギリス', 'カナダ', 'オーストラリア', 'ドイツ', 'フランス',
    'イタリア', 'スペイン', 'オランダ', 'スウェーデン', 'ノルウェー', 'デンマーク',
    '韓国', '台湾', 'タイ', 'シンガポール', 'その他'
  )
ORDER BY id;

-- ========== 1. CHECK を足す（これからの書き込みだけ確かめる） ==========
BEGIN;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_male_nationality_allowed CHECK (
  gender IS DISTINCT FROM 'male'
  OR nationality IS NULL
  OR nationality IN (
    'アメリカ', 'イギリス', 'カナダ', 'オーストラリア', 'ドイツ', 'フランス',
    'イタリア', 'スペイン', 'オランダ', 'スウェーデン', 'ノルウェー', 'デンマーク',
    '韓国', '台湾', 'タイ', 'シンガポール', 'その他'
  )
) NOT VALID;
COMMIT;

-- ========== 2. 既存の行も確かめる（0 が 0 行のときだけ） ==========
BEGIN;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_male_nationality_allowed;
COMMIT;

-- ========== 3. 確かめる（convalidated = true であること） ==========
SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_male_nationality_allowed';

-- 外すとき（必要な場合だけ）：
-- BEGIN;
-- ALTER TABLE public.profiles DROP CONSTRAINT profiles_male_nationality_allowed;
-- COMMIT;
