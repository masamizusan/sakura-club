// #48: 文字の種類から言語を判定する（翻訳先と同じ言語なら AI を呼ばないため）
// 数えるのは「文字」（Unicode の Letter）だけ。絵文字・記号・数字・空白・句読点は数えない
//   ja：ひらがな＋カタカナ＋漢字が文字の 50% 以上、かつ ひらがな・カタカナを 1 文字以上含む
//   ko：ハングルが文字の 50% 以上
//   それ以外（英語・繁体字・混在・文字なし）は「判定できない」（null）
// 英語は他のラテン文字の言語と、繁体字は漢字だけの日本語と区別できないため判定しない

export type DetectedScriptLang = 'ja' | 'ko'

// tsconfig の target が古いため、u フラグは RegExp コンストラクタで作る（実行環境は Unicode プロパティに対応）
const LETTER = new RegExp('\\p{L}', 'u')
const HIRAGANA = new RegExp('\\p{Script=Hiragana}', 'u')
const KATAKANA = new RegExp('\\p{Script=Katakana}', 'u')
const HAN = new RegExp('\\p{Script=Han}', 'u')
const HANGUL = new RegExp('\\p{Script=Hangul}', 'u')

export function detectScriptLang(text: string): DetectedScriptLang | null {
  let letters = 0
  let kana = 0
  let han = 0
  let hangul = 0

  // 絵文字などのサロゲートペアを 1 文字として扱う
  for (const ch of Array.from(text)) {
    if (!LETTER.test(ch)) continue
    letters++
    if (HIRAGANA.test(ch) || KATAKANA.test(ch)) kana++
    else if (HAN.test(ch)) han++
    else if (HANGUL.test(ch)) hangul++
  }

  if (letters === 0) return null
  if (kana >= 1 && (kana + han) / letters >= 0.5) return 'ja'
  if (hangul / letters >= 0.5) return 'ko'
  return null
}
