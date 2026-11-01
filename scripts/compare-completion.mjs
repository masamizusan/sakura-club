#!/usr/bin/env node
/**
 * プロフィール完成度（src/utils/profileCompletion.ts）の新旧を比べる手順
 *
 * 使い方：
 *   node scripts/compare-completion.mjs            # 旧版 = 2b177f2f（C3 の書き直しの前）
 *   node scripts/compare-completion.mjs <git ref>  # 旧版を指定（例：HEAD~1）
 *
 * - 旧版は git show <ref>:src/utils/profileCompletion.ts で取り出し、新版は作業中のファイルを使う
 * - どちらも一時フォルダにコピーし、@/ の読み込み（logger・types）を置き換えて、
 *   Node の TypeScript 読み込み（--experimental-strip-types、Node 22.6 以上）で動かす
 * - 男女 × いくつかのデータ × 2 つの入口（calculateCompletion / calculateCompletionFromForm）で、
 *   戻り値をすべて比べる。ランダムなデータも決まった種で作って比べる
 * - 違いが 1 件でもあれば終了コード 1
 * - アプリのビルドには含まれない（scripts/ は Next.js の対象外）
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// TypeScript の読み込みが無効なら、有効にして自分を起動し直す
if (!process.features?.typescript) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit' })
  process.exit(result.status ?? 1)
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = 'src/utils/profileCompletion.ts'
const OLD_REF = process.argv[2] || '2b177f2f'

// @/ の読み込みを置き換える（logger は何もしないもの、types は型だけなので消す）
function prepare(source) {
  return source
    .replace(/^import\s*\{[^}]*\}\s*from\s*'@\/utils\/logger'.*$/m, 'const logger = { warn() {}, debug() {}, info() {}, error() {} }')
    .replace(/^import\s*\{[^}]*\}\s*from\s*'@\/types\/profile'.*$/m, '')
}

const oldSource = execFileSync('git', ['show', `${OLD_REF}:${FILE}`], { cwd: ROOT, encoding: 'utf8' })
const newSource = readFileSync(join(ROOT, FILE), 'utf8')
if (/from\s*'@\//.test(prepare(oldSource)) || /from\s*'@\//.test(prepare(newSource))) {
  console.error('置き換えていない @/ の読み込みがあります。prepare() を直してください。')
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'compare-completion-'))
writeFileSync(join(dir, 'old.ts'), prepare(oldSource))
writeFileSync(join(dir, 'new.ts'), prepare(newSource))
const OLD = await import(pathToFileURL(join(dir, 'old.ts')).href)
const NEW = await import(pathToFileURL(join(dir, 'new.ts')).href)
rmSync(dir, { recursive: true, force: true })

// ---------------------------------------------------------------------------
// データ
// ---------------------------------------------------------------------------

const IMG = { id: '1', url: 'https://example.com/a.jpg', originalUrl: 'https://example.com/a.jpg', isMain: true, isEdited: false }
const LANG_EN = [{ language: 'en', level: 'advanced' }]
const LANG_JA = [{ language: 'ja', level: 'beginner' }]

const FULL_FEMALE = {
  nickname: 'さくら', gender: 'female', age: 28, birth_date: '1997-04-01', residence: '東京都', prefecture: '東京都',
  nationality: '日本', self_introduction: 'はじめまして。'.repeat(10), occupation: '会社員', height: 160,
  body_type: 'slim', marital_status: 'single', language_skills: LANG_EN, personality: ['優しい'], hobbies: ['茶道'],
  avatar_url: 'https://example.com/a.jpg',
}
const FULL_MALE = {
  nickname: 'John', gender: 'male', age: 32, birth_date: '1993-01-01', nationality: 'アメリカ',
  self_introduction: 'Hello. '.repeat(20), occupation: '会社員', height: 180, body_type: 'average',
  marital_status: 'single', language_skills: LANG_JA, personality: ['明るい'], hobbies: ['寿司'],
  planned_prefectures: ['東京都'], visit_schedule: '2027-spring', travel_companion: 'alone',
  avatar_url: 'https://example.com/a.jpg',
}

// [名前, データ, 画像の配列]
const FIXED = [
  ['空', {}, []],
  ['空（画像の配列なし）', {}, undefined],
  ['全部（女性）', FULL_FEMALE, [IMG]],
  ['全部（男性）', FULL_MALE, [IMG]],
  ['全部（女性・画像は avatar_url だけ）', FULL_FEMALE, []],
  ['全部（男性・画像なし）', { ...FULL_MALE, avatar_url: '' }, []],
  ['一部：未入力扱いの値', {
    nickname: '  ', gender: 'male', age: 0, birth_date: '', nationality: '国籍を選択', residence: '   ',
    self_introduction: '後でプロフィールを詳しく書きます。', occupation: 'none', height: 0, body_type: 'none',
    marital_status: 'none', language_skills: [{ language: 'none', level: 'none' }], personality: [], hobbies: [],
    planned_prefectures: [], visit_schedule: 'no-entry', travel_companion: 'undecided',
  }, []],
  ['一部：noEntry・forms.noEntry・none', { ...FULL_MALE, visit_schedule: 'noEntry', travel_companion: 'forms.noEntry', nationality: 'none' }, [IMG]],
  ['一部：visit forms.noEntry・travel no-entry', { ...FULL_MALE, visit_schedule: 'forms.noEntry', travel_companion: 'no-entry' }, [IMG]],
  ['一部：visit none・travel none', { ...FULL_MALE, visit_schedule: 'none', travel_companion: 'none' }, [IMG]],
  ['一部：visit undecided（訪問時期は未定でも入力済み）', { ...FULL_MALE, visit_schedule: 'undecided' }, [IMG]],
  ['一部：仮の文 2', { ...FULL_FEMALE, self_introduction: '後ほど入力します' }, [IMG]],
  ['一部：仮の文 3', { ...FULL_FEMALE, self_introduction: '後で入力します' }, [IMG]],
  ['一部：仮の文の前後に空白（入力済み扱い）', { ...FULL_FEMALE, self_introduction: ' 後で入力します ' }, [IMG]],
  ['一部：言語 none だけ', { ...FULL_FEMALE, language_skills: [{ language: 'none', level: 'none' }] }, [IMG]],
  ['一部：言語のレベルが空', { ...FULL_FEMALE, language_skills: [{ language: 'en', level: '' }] }, [IMG]],
  ['一部：言語のレベルが空白', { ...FULL_FEMALE, language_skills: [{ language: 'en', level: '  ' }] }, [IMG]],
  ['一部：言語 none ＋ 有効 1 つ', { ...FULL_FEMALE, language_skills: [{ language: 'none', level: 'none' }, ...LANG_EN] }, [IMG]],
  ['一部：言語が配列でない', { ...FULL_FEMALE, language_skills: 'en' }, [IMG]],
  ['一部：言語に null', { ...FULL_FEMALE, language_skills: [null] }, [IMG]],
  ['一部：身長が文字列', { ...FULL_FEMALE, height: '160' }, [IMG]],
  ['一部：年齢が負', { ...FULL_FEMALE, age: -1 }, [IMG]],
  ['一部：性別が空白（入力済み扱い）', { ...FULL_FEMALE, gender: ' ' }, [IMG]],
  ['一部：居住地なし・prefecture だけ', { ...FULL_FEMALE, residence: '', prefecture: '大阪府' }, [IMG]],
  ['一部：居住地だけ・prefecture なし', { ...FULL_FEMALE, prefecture: undefined, residence: '大阪府' }, [IMG]],
  ['一部：personality が配列でない', { ...FULL_FEMALE, personality: '優しい' }, [IMG]],
  ['画像：配列の url が空・originalUrl あり', FULL_MALE, [{ url: '', originalUrl: 'https://example.com/b.jpg' }]],
  ['画像：配列の avatar_url だけ', { ...FULL_MALE, avatar_url: '' }, [{ avatar_url: 'https://example.com/b.jpg' }]],
  ['画像：配列の url が空白', { ...FULL_MALE, avatar_url: '' }, [{ url: '  ' }]],
  ['画像：配列に null', { ...FULL_MALE, avatar_url: '' }, [null]],
  ['画像：profile_image だけ', { ...FULL_MALE, avatar_url: undefined, profile_image: 'path/x.jpg' }, []],
  ['画像：avatar_url が空白', { ...FULL_MALE, avatar_url: '   ' }, []],
  ['画像：data URI', { ...FULL_MALE, avatar_url: 'data:image/png;base64,AAAA' }, []],
  ['画像：has_profile_image＋fromMyPage', { ...FULL_MALE, has_profile_image: true, fromMyPage: true }, []],
  ['画像：has_profile_image だけ', { ...FULL_MALE, avatar_url: '', has_profile_image: true }, []],
  ['画像：avatarUrl だけ（写真なし扱い）', { ...FULL_MALE, avatar_url: '', avatarUrl: 'https://example.com/a.jpg' }, []],
]

// ランダムなデータ（決まった種）
function makeRandom(seed) {
  let s = seed >>> 0
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const pick = (list) => list[Math.floor(rand() * list.length)]
  const texts = [undefined, null, '', ' ', 'x', '  y  ']
  const selects = [undefined, '', 'none', 'no-entry', 'noEntry', 'forms.noEntry', 'undecided', 'alone', '2027-spring', 'currently-in-japan']
  const arrays = [undefined, null, [], ['a'], ['a', 'b'], 'a']
  const langs = [undefined, null, [], [{ language: 'none', level: 'none' }], LANG_EN, [{ language: 'en', level: '' }], [{ language: ' ', level: 'x' }], [null], 'en']
  const images = [undefined, [], [IMG], [{ url: '' }], [{ originalUrl: 'u' }], [{ avatar_url: ' ' }], [null]]
  const cases = []
  for (let i = 0; i < 2000; i++) {
    const data = {
      nickname: pick(texts), gender: pick([undefined, '', 'male', 'female', ' ']), age: pick([undefined, 0, -1, 20, '30']),
      birth_date: pick([undefined, '', '2000-01-01']), nationality: pick([undefined, '', '国籍を選択', 'none', 'アメリカ']),
      residence: pick(texts), prefecture: pick([undefined, '', '東京都']),
      self_introduction: pick([...texts, '後でプロフィールを詳しく書きます。', '後ほど入力します', '後で入力します', 'こんにちは']),
      occupation: pick(selects), height: pick([undefined, 0, 160, '170', -5]), body_type: pick(selects), marital_status: pick(selects),
      language_skills: pick(langs), personality: pick(arrays), hobbies: pick(arrays), planned_prefectures: pick(arrays),
      visit_schedule: pick(selects), travel_companion: pick(selects),
      avatar_url: pick([undefined, '', ' ', 'https://example.com/a.jpg', 'data:image/png;base64,A']),
      profile_image: pick([undefined, '', 'p.jpg']), avatarUrl: pick([undefined, 'u']),
      has_profile_image: pick([undefined, true, false]), fromMyPage: pick([undefined, true]),
    }
    cases.push([`ランダム #${i}`, data, pick(images)])
  }
  return cases
}

// ---------------------------------------------------------------------------
// 比べる
// ---------------------------------------------------------------------------

const ENTRIES = [
  ['calculateCompletion', (m, data, userType, images) => m.calculateCompletion(data, userType, images)],
  ['calculateCompletionFromForm', (m, data, userType, images) => m.calculateCompletionFromForm(data, userType, images)],
]
const USER_TYPES = ['japanese-female', 'foreign-male']

function run(fn) {
  try {
    return { ok: true, value: fn() }
  } catch (error) {
    return { ok: false, value: `例外: ${error?.message}` }
  }
}

const summary = (r) => (r.ok ? `${r.value.completion}% (${r.value.completedFields}/${r.value.totalFields})` : r.value)

let diffCount = 0
let total = 0
const printFixed = []

for (const [label, cases] of [['決まったデータ', FIXED], ['ランダムなデータ', makeRandom(20261101)]]) {
  for (const [name, data, images] of cases) {
    for (const userType of USER_TYPES) {
      for (const [entryName, call] of ENTRIES) {
        // calculateCompletionFromForm の画像の配列は既定値 [] なので、undefined のときはそのまま渡す
        const oldResult = run(() => call(OLD, structuredClone(data), userType, images && structuredClone(images)))
        const newResult = run(() => call(NEW, structuredClone(data), userType, images && structuredClone(images)))
        const same = JSON.stringify(oldResult) === JSON.stringify(newResult)
        total++
        if (!same) {
          diffCount++
          console.log(`❌ 違い [${label}] ${name} / ${userType} / ${entryName}`)
          console.log('   旧:', JSON.stringify(oldResult.value))
          console.log('   新:', JSON.stringify(newResult.value))
        }
        if (label === '決まったデータ') {
          printFixed.push(`${same ? '同じ' : '違う'} | ${name} | ${userType === 'japanese-female' ? '女性' : '男性'} | ${entryName === 'calculateCompletion' ? 'DB' : 'フォーム'} | 旧 ${summary(oldResult)} | 新 ${summary(newResult)}`)
        }
      }
    }
  }
}

console.log(`旧版：${OLD_REF}:${FILE} ／ 新版：作業中の ${FILE}`)
console.log('結果 | データ | 男女 | 入口 | 旧 | 新')
for (const line of printFixed) console.log(line)
console.log(`\n比べた件数：${total}（決まったデータ ${FIXED.length} 種・ランダム 2000 種 × 男女 × 入口 2 つ）`)
console.log(diffCount === 0 ? '✅ すべて同じ' : `❌ 違い ${diffCount} 件`)
process.exit(diffCount === 0 ? 0 : 1)
