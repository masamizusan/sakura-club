/**
 * Sakura Club - Profile Type Definitions
 * 使用言語＋言語レベル機能の型定義
 */

// 言語コード（空文字はplaceholder表示のための一時的な値）
export type LanguageCode = '' | 'none' | 'ja' | 'en' | 'ko' | 'zh-TW';

// 言語レベル（既存システムと統一・空文字はplaceholder表示のための一時的な値）
export type LanguageLevelCode =
  | ''                // 一時的な未選択（placeholder表示用）
  | 'none'            // 未選択・記入しない
  | 'beginner'        // 初級
  | 'beginner_plus'   // 初級上
  | 'intermediate'    // 中級
  | 'intermediate_plus' // 中級上
  | 'advanced'        // 上級
  | 'native';         // ネイティブレベル

// 言語スキル
export interface LanguageSkill {
  language: LanguageCode;
  level: LanguageLevelCode;
}

// 言語の表示ラベル
export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  '': '選択してください',
  none: '選択してください', 
  ja: '日本語',
  en: '英語',
  ko: '韓国語',
  'zh-TW': '中国語（繁体字）'
};

// 言語レベルの表示ラベル
export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevelCode, string> = {
  '': '選択してください',
  none: '選択してください',
  beginner: '初級（日常会話は難しい）',
  beginner_plus: '初級上（基本的な日常会話ができる）',
  intermediate: '中級（日常会話は問題ない）',
  intermediate_plus: '中級上（複雑な話題も理解できる）',
  advanced: '上級（流暢に話せる）',
  native: 'ネイティブレベル'
};

// 完全なProfile型（既存システム拡張）
export interface Profile {
  // 基本情報
  id?: string;
  name?: string;
  bio?: string;
  age?: number;
  birth_date?: string;
  gender?: 'male' | 'female';
  nationality?: string;
  prefecture?: string;
  residence?: string;
  
  // 画像
  avatar_url?: string;
  profile_image?: string;
  
  // 専用カラム（2025-11-27追加）
  occupation?: string;
  height?: number;
  body_type?: string;
  marital_status?: string;
  
  // 都市情報（JSON形式）
  city?: string;
  
  // 趣味・文化（Triple-save対応）
  interests?: string[];
  hobbies?: string[];
  culture_tags?: string[];
  personality_tags?: string[];
  personality?: string[];
  custom_culture?: string;
  
  // 外国人男性専用
  visit_schedule?: string;
  travel_companion?: string;
  planned_prefectures?: string[];
  planned_stations?: string[];
  
  // ✨ 新機能: 使用言語＋言語レベル
  language_skills?: LanguageSkill[];
  
  // 既存カラム（後方互換用・削除しない）
  japanese_level?: LanguageLevelCode;
  english_level?: LanguageLevelCode;
}

// 使用言語スキルのヘルパー関数
export const hasValidLanguageSkills = (skills?: LanguageSkill[]): boolean => {
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return false;
  }
  
  return skills.some(skill => 
    skill.language && 
    skill.level && 
    skill.level !== 'none'
  );
};

// 既存言語レベルから言語スキルを生成するヘルパー
export const generateLanguageSkillsFromLegacy = (
  profile: Partial<Profile> | null | undefined
): LanguageSkill[] => {
  const skills: LanguageSkill[] = [];
  
  // プロフィールが存在しない場合は空配列を返す
  if (!profile) {
    return skills;
  }
  
  // 基本情報がない場合は空配列を返す（新規ユーザー対応）
  if (!profile.gender || !profile.nationality) {
    return skills;
  }
  
  // 外国人男性の場合: japanese_level → 日本語スキル
  const isForeignMale = profile.gender === 'male' && 
    profile.nationality && 
    !['日本', 'japan'].includes(profile.nationality.toLowerCase());
    
  if (isForeignMale && profile.japanese_level && profile.japanese_level !== 'none') {
    skills.push({
      language: 'ja',
      level: profile.japanese_level
    });
  }
  
  // 日本人の場合: english_level → 英語スキル
  const isJapanese = profile.nationality && 
    ['日本', 'japan'].includes(profile.nationality.toLowerCase());
    
  if (isJapanese && profile.english_level && profile.english_level !== 'none') {
    skills.push({
      language: 'en',
      level: profile.english_level
    });
  }
  
  // ⚠️ デフォルト自動設定は削除 - ユーザーが明示的に選択したもののみを尊重
  
  return skills;
};