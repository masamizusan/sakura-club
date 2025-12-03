/**
 * 言語スキル関連のヘルパー関数
 */

export type LanguageSkill = {
  language: 'japanese' | 'english' | 'ja' | 'en' | 'ko' | 'zh-TW' | string;
  level: string;
};

/**
 * フォーム値から言語スキル配列を構築
 */
export const buildLanguageSkillsFromForm = (values: any): LanguageSkill[] => {
  const skills: LanguageSkill[] = [];

  if (values.japanese_level && values.japanese_level !== 'none') {
    skills.push({
      language: 'ja',
      level: values.japanese_level,
    });
    console.log('🗣️ buildLanguageSkillsFromForm: added japanese', values.japanese_level);
  }

  if (values.english_level && values.english_level !== 'none') {
    skills.push({
      language: 'en',
      level: values.english_level,
    });
    console.log('🗣️ buildLanguageSkillsFromForm: added english', values.english_level);
  }

  console.log('🗣️ buildLanguageSkillsFromForm: final skills', skills);
  return skills;
};

/**
 * 言語スキル配列が有効かチェック
 */
export const hasValidLanguageSkills = (skills: LanguageSkill[]): boolean => {
  return Array.isArray(skills) && skills.length > 0 && 
    skills.some(skill => 
      skill && skill.language && skill.level && 
      skill.language !== 'none' && skill.level !== 'none'
    );
};