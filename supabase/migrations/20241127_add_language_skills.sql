-- ====================================================================
-- Sakura Club: 使用言語＋言語レベル機能追加マイグレーション
-- 日付: 2024-11-27
-- 目的: language_skills JSONB カラム追加と既存データ移行
-- ====================================================================

-- 1. language_skills カラム追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language_skills JSONB;

-- 2. インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_language_skills_gin 
ON public.profiles USING GIN (language_skills);

-- 3. 既存データからの初期化
-- 注意: 既存の japanese_level / english_level カラムは削除しない（後方互換性維持）

UPDATE public.profiles
SET language_skills = (
  CASE
    -- 外国人男性: japanese_level → 日本語スキルとして移行
    WHEN nationality IS NOT NULL
         AND nationality NOT IN ('日本', 'japan')
         AND gender = 'male'
         AND japanese_level IS NOT NULL
         AND japanese_level <> 'none'
    THEN jsonb_build_array(
      jsonb_build_object(
        'language', 'ja',
        'level', japanese_level
      )
    )

    -- 日本人（女性含む）: english_level → 英語スキルとして移行
    WHEN (nationality IS NULL OR nationality IN ('日本', 'japan'))
         AND english_level IS NOT NULL
         AND english_level <> 'none'
    THEN jsonb_build_array(
      jsonb_build_object(
        'language', 'en',
        'level', english_level
      )
    )

    -- 日本国籍ユーザーでレベル未設定の場合: 日本語ネイティブを付与
    WHEN (nationality IS NULL OR nationality IN ('日本', 'japan'))
    THEN jsonb_build_array(
      jsonb_build_object(
        'language', 'ja',
        'level', 'native'
      )
    )

    ELSE NULL
  END
)
WHERE language_skills IS NULL;

-- 4. マイグレーション結果確認用コメント
-- 確認クエリ（実行時に手動でチェック）:
-- SELECT 
--   nationality, gender, japanese_level, english_level, language_skills, 
--   jsonb_array_length(language_skills) as skill_count
-- FROM public.profiles 
-- WHERE language_skills IS NOT NULL 
-- LIMIT 10;