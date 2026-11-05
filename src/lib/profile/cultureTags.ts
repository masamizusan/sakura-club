/**
 * 日本文化のタグ（7 分類・46 項目）の唯一の表（C8・2026-11）
 *
 * - DB（profiles.interests）に保存する値は日本語の value。「・」でつなぐ項目（着物・浴衣 など）も 1 つの値
 * - 編集画面の選択肢・プレビュー・相手のプロフィール・さがす・いいね・足跡のカードは、この表で表示する
 * - 昔のタグ（86 項目時代の値。日本語・英語・韓国語・繁体字の表示名、英語のキー）は LEGACY で新しい値に直す。
 *   null は「消す値」（表示しない・編集画面の読み込みで捨てる）
 * - DB の置き換え：supabase/migrations/20261105_stage19_culture_tags.sql（この表から作った変換表）
 */

import type { SupportedLanguage } from '@/utils/language'

type Labels = Record<SupportedLanguage, string>

export type CultureTag = { key: string; value: string; labels: Labels }
export type CultureCategory = { key: string; labels: Labels; tags: readonly CultureTag[] }

export const CULTURE_CATEGORIES: readonly CultureCategory[] = [
  {
    key: 'traditional',
    labels: { ja: '伝統文化・体験', en: 'Traditional Culture & Experiences', ko: '전통 문화・체험', 'zh-tw': '傳統文化・體驗' },
    tags: [
      { key: 'teaCeremony', value: '茶道', labels: { ja: '茶道', en: 'Tea Ceremony', ko: '다도', 'zh-tw': '茶道' } },
      { key: 'flowerArrangement', value: '華道', labels: { ja: '華道', en: 'Ikebana (Flower Arrangement)', ko: '꽃꽂이(이케바나)', 'zh-tw': '花道' } },
      { key: 'calligraphy', value: '書道', labels: { ja: '書道', en: 'Calligraphy', ko: '서예', 'zh-tw': '書法' } },
      { key: 'kimono', value: '着物・浴衣', labels: { ja: '着物・浴衣', en: 'Kimono & Yukata', ko: '기모노・유카타', 'zh-tw': '和服・浴衣' } },
      { key: 'pottery', value: '陶芸', labels: { ja: '陶芸', en: 'Pottery', ko: '도예', 'zh-tw': '陶藝' } },
      { key: 'origami', value: '折り紙', labels: { ja: '折り紙', en: 'Origami', ko: '종이접기', 'zh-tw': '摺紙' } },
      { key: 'bonsai', value: '盆栽', labels: { ja: '盆栽', en: 'Bonsai', ko: '분재', 'zh-tw': '盆栽' } },
      { key: 'zazen', value: '座禅', labels: { ja: '座禅', en: 'Zazen Meditation', ko: '좌선', 'zh-tw': '坐禪' } },
      { key: 'craftWorkshops', value: '工芸体験', labels: { ja: '工芸体験', en: 'Craft Workshops', ko: '공예 체험', 'zh-tw': '工藝體驗' } },
    ],
  },
  {
    key: 'sightseeing',
    labels: { ja: '名所・町歩き', en: 'Sightseeing & Strolling', ko: '명소・거리 산책', 'zh-tw': '名勝・街道散步' },
    tags: [
      { key: 'shrinesTemples', value: '神社仏閣', labels: { ja: '神社仏閣', en: 'Shrines & Temples', ko: '신사・사찰', 'zh-tw': '神社寺廟' } },
      { key: 'sealCollection', value: '御朱印集め', labels: { ja: '御朱印集め', en: 'Goshuin (Temple Stamp) Collecting', ko: '고슈인 모으기', 'zh-tw': '收集御朱印' } },
      { key: 'japaneseGardens', value: '日本庭園', labels: { ja: '日本庭園', en: 'Japanese Gardens', ko: '일본 정원', 'zh-tw': '日本庭園' } },
      { key: 'castles', value: '城めぐり', labels: { ja: '城めぐり', en: 'Castle Tours', ko: '성 순례', 'zh-tw': '城堡巡禮' } },
      { key: 'hotSprings', value: '温泉', labels: { ja: '温泉', en: 'Hot Springs (Onsen)', ko: '온천', 'zh-tw': '溫泉' } },
      { key: 'sento', value: '銭湯', labels: { ja: '銭湯', en: 'Public Baths (Sento)', ko: '대중목욕탕(센토)', 'zh-tw': '錢湯' } },
      { key: 'oldHouseCafe', value: '古民家カフェ', labels: { ja: '古民家カフェ', en: 'Old House Cafés', ko: '고민가 카페', 'zh-tw': '古民家咖啡廳' } },
    ],
  },
  {
    key: 'seasonal',
    labels: { ja: '季節・行事', en: 'Seasons & Events', ko: '계절・행사', 'zh-tw': '季節・節慶活動' },
    tags: [
      { key: 'cherryBlossom', value: 'お花見', labels: { ja: 'お花見', en: 'Cherry Blossom Viewing', ko: '벚꽃 구경', 'zh-tw': '賞櫻' } },
      { key: 'autumnLeaves', value: '紅葉狩り', labels: { ja: '紅葉狩り', en: 'Autumn Leaves Viewing', ko: '단풍 구경', 'zh-tw': '賞楓' } },
      { key: 'fireworks', value: '花火大会', labels: { ja: '花火大会', en: 'Fireworks Festivals', ko: '불꽃놀이 축제', 'zh-tw': '煙火大會' } },
      { key: 'festivals', value: 'お祭り', labels: { ja: 'お祭り', en: 'Festivals (Matsuri)', ko: '마쓰리(축제)', 'zh-tw': '祭典' } },
      { key: 'bonDance', value: '盆踊り', labels: { ja: '盆踊り', en: 'Bon Odori Dance', ko: '봉오도리', 'zh-tw': '盆舞' } },
      { key: 'snowScape', value: '雪景色', labels: { ja: '雪景色', en: 'Snow Scenery', ko: '설경', 'zh-tw': '雪景' } },
    ],
  },
  {
    key: 'food',
    labels: { ja: '食', en: 'Food', ko: '음식', 'zh-tw': '美食' },
    tags: [
      { key: 'sushi', value: '寿司', labels: { ja: '寿司', en: 'Sushi', ko: '초밥', 'zh-tw': '壽司' } },
      { key: 'ramen', value: 'ラーメン', labels: { ja: 'ラーメン', en: 'Ramen', ko: '라멘', 'zh-tw': '拉麵' } },
      { key: 'tempura', value: '天ぷら', labels: { ja: '天ぷら', en: 'Tempura', ko: '덴푸라(튀김)', 'zh-tw': '天婦羅' } },
      { key: 'sobaUdon', value: 'そば・うどん', labels: { ja: 'そば・うどん', en: 'Soba & Udon', ko: '소바・우동', 'zh-tw': '蕎麥麵・烏龍麵' } },
      { key: 'okonomiyakiTakoyaki', value: 'お好み焼き・たこ焼き', labels: { ja: 'お好み焼き・たこ焼き', en: 'Okonomiyaki & Takoyaki', ko: '오코노미야키・타코야키', 'zh-tw': '大阪燒・章魚燒' } },
      { key: 'homeCooking', value: '家庭料理', labels: { ja: '家庭料理', en: 'Home Cooking', ko: '가정 요리', 'zh-tw': '家常料理' } },
      { key: 'izakaya', value: '居酒屋', labels: { ja: '居酒屋', en: 'Izakaya', ko: '이자카야', 'zh-tw': '居酒屋' } },
      { key: 'sakeShochu', value: '日本酒・焼酎', labels: { ja: '日本酒・焼酎', en: 'Sake & Shochu', ko: '사케・소주', 'zh-tw': '日本酒・燒酎' } },
      { key: 'localSpecialties', value: 'ご当地グルメ', labels: { ja: 'ご当地グルメ', en: 'Local Specialties', ko: '지역 명물 음식', 'zh-tw': '在地美食' } },
    ],
  },
  {
    key: 'sweets',
    labels: { ja: '甘いもの', en: 'Sweets', ko: '디저트', 'zh-tw': '甜點' },
    tags: [
      { key: 'matchaSweets', value: '抹茶スイーツ', labels: { ja: '抹茶スイーツ', en: 'Matcha Sweets', ko: '말차 디저트', 'zh-tw': '抹茶甜點' } },
      { key: 'wagashi', value: '和菓子', labels: { ja: '和菓子', en: 'Wagashi (Japanese Sweets)', ko: '화과자', 'zh-tw': '和菓子' } },
      { key: 'streetFood', value: '屋台グルメ', labels: { ja: '屋台グルメ', en: 'Street Food Stalls', ko: '포장마차 먹거리', 'zh-tw': '屋台小吃' } },
    ],
  },
  {
    key: 'arts',
    labels: { ja: '武道・芸能', en: 'Martial Arts & Performing Arts', ko: '무도・전통 예능', 'zh-tw': '武道・表演藝術' },
    tags: [
      { key: 'sumo', value: '相撲', labels: { ja: '相撲', en: 'Sumo', ko: '스모', 'zh-tw': '相撲' } },
      { key: 'martialArts', value: '武道', labels: { ja: '武道', en: 'Martial Arts', ko: '무도', 'zh-tw': '武道' } },
      { key: 'kabukiNoh', value: '歌舞伎・能', labels: { ja: '歌舞伎・能', en: 'Kabuki & Noh', ko: '가부키・노', 'zh-tw': '歌舞伎・能劇' } },
      { key: 'taiko', value: '和太鼓', labels: { ja: '和太鼓', en: 'Taiko Drums', ko: '와다이코(일본 북)', 'zh-tw': '和太鼓' } },
      { key: 'japaneseDance', value: '日本舞踊', labels: { ja: '日本舞踊', en: 'Japanese Dance', ko: '일본 무용', 'zh-tw': '日本舞蹈' } },
    ],
  },
  {
    key: 'modernCulture',
    labels: { ja: '現代カルチャー', en: 'Modern Culture', ko: '현대 문화', 'zh-tw': '現代流行文化' },
    tags: [
      { key: 'anime', value: 'アニメ', labels: { ja: 'アニメ', en: 'Anime', ko: '애니메이션', 'zh-tw': '動畫' } },
      { key: 'manga', value: 'マンガ', labels: { ja: 'マンガ', en: 'Manga', ko: '만화', 'zh-tw': '漫畫' } },
      { key: 'games', value: 'ゲーム', labels: { ja: 'ゲーム', en: 'Games', ko: '게임', 'zh-tw': '遊戲' } },
      { key: 'jpopIdols', value: 'J-POP・アイドル', labels: { ja: 'J-POP・アイドル', en: 'J-POP & Idols', ko: 'J-POP・아이돌', 'zh-tw': 'J-POP・偶像' } },
      { key: 'karaoke', value: 'カラオケ', labels: { ja: 'カラオケ', en: 'Karaoke', ko: '노래방', 'zh-tw': '卡拉OK' } },
      { key: 'moviesDramas', value: '映画・ドラマ', labels: { ja: '映画・ドラマ', en: 'Movies & Dramas', ko: '영화・드라마', 'zh-tw': '電影・日劇' } },
      { key: 'cosplay', value: 'コスプレ', labels: { ja: 'コスプレ', en: 'Cosplay', ko: '코스프레', 'zh-tw': '角色扮演' } },
    ],
  },
]

export const CULTURE_TAGS: readonly CultureTag[] = CULTURE_CATEGORIES.flatMap(category => category.tags)

// 昔の表示名（4 言語）→ 新しい値（null は消す値）。今の表示名と同じものは含めない（今の表示名を優先）
const LEGACY_LABELS: Record<string, string | null> = {
  '禅': '座禅',
  'うなぎ': null,
  '牛丼': null,
  'とんかつ': null,
  'お好み焼き': 'お好み焼き・たこ焼き',
  'たこ焼き': 'お好み焼き・たこ焼き',
  'カレーライス': '家庭料理',
  'コンビニフード': null,
  'ポテトチップス': null,
  '出汁': '家庭料理',
  '味噌': '家庭料理',
  '豆腐': '家庭料理',
  '梅干し': '家庭料理',
  '漬物': '家庭料理',
  '日本酒': '日本酒・焼酎',
  '焼酎': '日本酒・焼酎',
  'そば': 'そば・うどん',
  'うどん': 'そば・うどん',
  '桜見物': 'お花見',
  '祭り': 'お祭り',
  '日本の四季': null,
  '日本庭園散策': '日本庭園',
  '団子': '和菓子',
  'たい焼き': '屋台グルメ',
  '大判焼き': '屋台グルメ',
  'わらび餅': '和菓子',
  'りんご飴': '屋台グルメ',
  'わたあめ': '屋台グルメ',
  '駄菓子': null,
  'コンビニスイーツ': null,
  '剣道': '武道',
  '柔道': '武道',
  '空手': '武道',
  '弓道': '武道',
  '合気道': '武道',
  '薙刀': '武道',
  '歌舞伎': '歌舞伎・能',
  '能': '歌舞伎・能',
  '邦楽': null,
  '演歌': null,
  '太鼓': '和太鼓',
  '障子': null,
  '襖の張り替え': null,
  '畳': null,
  '昭和レトロ家電': null,
  '和モダンインテリア': null,
  '日本のゲーム': 'ゲーム',
  'J-POP': 'J-POP・アイドル',
  '日本映画': '映画・ドラマ',
  'ドラマ': '映画・ドラマ',
  'ボーカロイド': 'J-POP・アイドル',
  'アイドル文化': 'J-POP・アイドル',
  '漆器': '工芸体験',
  '金箔貼り': '工芸体験',
  '和紙漉き': '工芸体験',
  '染物': '工芸体験',
  '刀鍛冶': '工芸体験',
  '木工': '工芸体験',
  '飴細工': '工芸体験',
  'Flower Arrangement': '華道',
  'Wagashi': '和菓子',
  'Goshuin Collection': '御朱印集め',
  'Zen': '座禅',
  'Unagi': null,
  'Gyudon': null,
  'Tonkatsu': null,
  'Okonomiyaki': 'お好み焼き・たこ焼き',
  'Takoyaki': 'お好み焼き・たこ焼き',
  'Japanese Curry': '家庭料理',
  'Konbini Food': null,
  'Japanese Chips': null,
  'Dashi': '家庭料理',
  'Miso': '家庭料理',
  'Tofu': '家庭料理',
  'Umeboshi': '家庭料理',
  'Japanese Pickles': '家庭料理',
  'Sake': '日本酒・焼酎',
  'Shochu': '日本酒・焼酎',
  'Soba': 'そば・うどん',
  'Udon': 'そば・うどん',
  'Hot Springs': '温泉',
  'Festivals': 'お祭り',
  'Fireworks Display': '花火大会',
  'Snowy Scenery': '雪景色',
  'Four Seasons': null,
  'Bon Dance': '盆踊り',
  'Japanese Garden Walk': '日本庭園',
  'Dango': '和菓子',
  'Taiyaki': '屋台グルメ',
  'Obanyaki': '屋台グルメ',
  'Warabimochi': '和菓子',
  'Candied Apple': '屋台グルメ',
  'Cotton Candy': '屋台グルメ',
  'Dagashi': null,
  'Convenience Store Sweets': null,
  'Kendo': '武道',
  'Judo': '武道',
  'Karate': '武道',
  'Kyudo': '武道',
  'Aikido': '武道',
  'Naginata': '武道',
  'Kabuki': '歌舞伎・能',
  'Noh': '歌舞伎・能',
  'Traditional Music': null,
  'Enka': null,
  'Taiko': '和太鼓',
  'Shoji': null,
  'Fusuma': null,
  'Tatami': null,
  'Kominka Cafe': '古民家カフェ',
  'Sento': '銭湯',
  'Showa Retro': null,
  'Japanese Modern Interior': null,
  'Japanese Games': 'ゲーム',
  'Japanese Movies': '映画・ドラマ',
  'Japanese Drama': '映画・ドラマ',
  'Vocaloid': 'J-POP・アイドル',
  'Idol Culture': 'J-POP・アイドル',
  'Lacquerware': '工芸体験',
  'Gold Leaf Application': '工芸体験',
  'Japanese Paper Making': '工芸体験',
  'Traditional Dyeing': '工芸体験',
  'Sword Smithing': '工芸体験',
  'Woodworking': '工芸体験',
  'Japanese Sugar Art': '工芸体験',
  '꽃꽂이': '華道',
  '기모노 & 유카타': '着物・浴衣',
  '신사 & 절': '神社仏閣',
  '고슈인 수집': '御朱印集め',
  '선': '座禅',
  '스시': '寿司',
  '텐푸라': '天ぷら',
  '장어': null,
  '규동': null,
  '돈카츠': null,
  '오코노미야키': 'お好み焼き・たこ焼き',
  '타코야키': 'お好み焼き・たこ焼き',
  '일본 카레': '家庭料理',
  '편의점 음식': null,
  '일본 과자': null,
  '다시': '家庭料理',
  '미소': '家庭料理',
  '두부': '家庭料理',
  '우메보시': '家庭料理',
  '절임 반찬': '家庭料理',
  '사케': '日本酒・焼酎',
  '소주': '日本酒・焼酎',
  '소바': 'そば・うどん',
  '우동': 'そば・うどん',
  '벚꽃놀이': 'お花見',
  '단풍구경': '紅葉狩り',
  '축제': 'お祭り',
  '불꽃놀이': '花火大会',
  '일본의 사계절': null,
  '일본 정원 산책': '日本庭園',
  '당고': '和菓子',
  '타이야키': '屋台グルメ',
  '오반야키': '屋台グルメ',
  '와라비모치': '和菓子',
  '사과사탕': '屋台グルメ',
  '솜사탕': '屋台グルメ',
  '다가시': null,
  '편의점 디저트': null,
  '검도': '武道',
  '유도': '武道',
  '가라테': '武道',
  '궁도': '武道',
  '합기도': '武道',
  '나기나타': '武道',
  '가부키': '歌舞伎・能',
  '노': '歌舞伎・能',
  '전통 음악': null,
  '엔카': null,
  '타이코': '和太鼓',
  '쇼지': null,
  '후스마': null,
  '다다미': null,
  '센토': '銭湯',
  '쇼와 레트로': null,
  '일본 모던 인테리어': null,
  '일본 게임': 'ゲーム',
  '일본 영화': '映画・ドラマ',
  '일본 드라마': '映画・ドラマ',
  '보컬로이드': 'J-POP・アイドル',
  '아이돌 문화': 'J-POP・アイドル',
  '칠기': '工芸体験',
  '금박 공예': '工芸体験',
  '화지 공예': '工芸体験',
  '전통 염색': '工芸体験',
  '일본도 제작': '工芸体験',
  '목공예': '工芸体験',
  '설탕 공예': '工芸体験',
  '御朱印收集': '御朱印集め',
  '禪': '座禅',
  '鰻魚': null,
  '炸豬排': null,
  '大阪燒': 'お好み焼き・たこ焼き',
  '章魚燒': 'お好み焼き・たこ焼き',
  '日式咖哩': '家庭料理',
  '便利商店美食': null,
  '日本零食': null,
  '高湯': '家庭料理',
  '梅干': '家庭料理',
  '燒酎': '日本酒・焼酎',
  '蕎麥麵': 'そば・うどん',
  '烏龍麵': 'そば・うどん',
  '日本四季': null,
  '日本庭園散步': '日本庭園',
  '糰子': '和菓子',
  '鯛魚燒': '屋台グルメ',
  '大判燒': '屋台グルメ',
  '蕨餅': '和菓子',
  '蘋果糖': '屋台グルメ',
  '棉花糖': '屋台グルメ',
  '便利商店甜點': null,
  '劍道': '武道',
  '空手道': '武道',
  '合氣道': '武道',
  '能劇': '歌舞伎・能',
  '邦樂': null,
  '襖': null,
  '榻榻米': null,
  '古民家咖啡館': '古民家カフェ',
  '昭和復古': null,
  '和式現代風格': null,
  '日本遊戲': 'ゲーム',
  '日本電影': '映画・ドラマ',
  '日劇': '映画・ドラマ',
  '偶像文化': 'J-POP・アイドル',
  '金箔工藝': '工芸体験',
  '和紙工藝': '工芸体験',
  '傳統染色': '工芸体験',
  '鑄劍': '工芸体験',
  '糖藝': '工芸体験',
  'Attending Festivals': 'お祭り',
  'Ringo Ame (Candied Apple)': '屋台グルメ',
  'Dagashi (Japanese Cheap Sweets)': null,
  'Hogaku (Traditional Japanese Music)': null,
  'Kominka Café': '古民家カフェ',
  '꽃꽂이/이케바나': '華道',
  '기모노/유카타': '着物・浴衣',
  '와가시': '和菓子',
  '신사와 사찰': '神社仏閣',
  '템푸라': '天ぷら',
  '우나기': null,
  '돈가스': null,
  '일본식 카레': '家庭料理',
  '일본 감자칩': null,
  '일본 절임': '家庭料理',
  '쇼추(일본식 소주)': '日本酒・焼酎',
  '축제 가기': 'お祭り',
  '불꽃축제': '花火大会',
  '사계절': null,
  '본오도리': '盆踊り',
  '단고': '和菓子',
  '링고아메/사과 사탕': '屋台グルメ',
  '아이키도': '武道',
  '일본 전통음악': null,
  '태고(일본 북)': '和太鼓',
  '재패니즈 모던 인테리어': null,
  '드라마': '映画・ドラマ',
  '금박 작업': '工芸体験',
  '일본 종이 만들기': '工芸体験',
  '염색': '工芸体験',
  '도검 제작': '工芸体験',
  '목공': '工芸体験',
  '和服與浴衣': '着物・浴衣',
  '神社與寺廟': '神社仏閣',
  '豬排': null,
  '日式洋芋片': null,
  '日式高湯': '家庭料理',
  '日式釃菜': '家庭料理',
  '逛祭典': 'お祭り',
  '四季': null,
  '團子': '和菓子',
  '今川燒': '屋台グルメ',
  '超商甜點': null,
  '和風現代設計': null,
  'KTV': 'カラオケ',
  '金箔裝飾': '工芸体験',
  '和紙製作': '工芸体験',
  '鍛刀': '工芸体験',
  '和菓子工藝': '工芸体験',
  '기모노': '着物・浴衣',
  '和服': '着物・浴衣',
  '祭り参加': 'お祭り',
  '着物': '着物・浴衣',
  '浴衣': '着物・浴衣',
  'お茶': '茶道',
  '日本料理': null,
  'その他': null,
  'Other': null,
}

// 昔・今の英語のキー（小文字にして比べる）→ 新しい値（null は消す値）
const LEGACY_KEYS: Record<string, string | null> = {
  'teaceremony': '茶道',
  'flowerarrangement': '華道',
  'ikebana': '華道',
  'calligraphy': '書道',
  'kimono': '着物・浴衣',
  'wagashi': '和菓子',
  'pottery': '陶芸',
  'origami': '折り紙',
  'bonsai': '盆栽',
  'shrinestemples': '神社仏閣',
  'sealcollection': '御朱印集め',
  'zen': '座禅',
  'tea': '茶道',
  'sushi': '寿司',
  'tempura': '天ぷら',
  'ramen': 'ラーメン',
  'okonomiyaki': 'お好み焼き・たこ焼き',
  'takoyaki': 'お好み焼き・たこ焼き',
  'curry': '家庭料理',
  'dashi': '家庭料理',
  'miso': '家庭料理',
  'tofu': '家庭料理',
  'umeboshi': '家庭料理',
  'pickles': '家庭料理',
  'sake': '日本酒・焼酎',
  'shochu': '日本酒・焼酎',
  'soba': 'そば・うどん',
  'udon': 'そば・うどん',
  'matchasweets': '抹茶スイーツ',
  'dango': '和菓子',
  'warabimochi': '和菓子',
  'taiyaki': '屋台グルメ',
  'obanyaki': '屋台グルメ',
  'candiedapple': '屋台グルメ',
  'cottoncandy': '屋台グルメ',
  'sumo': '相撲',
  'kendo': '武道',
  'judo': '武道',
  'karate': '武道',
  'kyudo': '武道',
  'aikido': '武道',
  'naginata': '武道',
  'martialarts': '武道',
  'kabuki': '歌舞伎・能',
  'noh': '歌舞伎・能',
  'japanesedance': '日本舞踊',
  'taiko': '和太鼓',
  'cherryblossom': 'お花見',
  'autumnleaves': '紅葉狩り',
  'fireworks': '花火大会',
  'festivals': 'お祭り',
  'festivalparticipation': 'お祭り',
  'bondance': '盆踊り',
  'snowscape': '雪景色',
  'gardenwalk': '日本庭園',
  'hotsprings': '温泉',
  'oldhousecafe': '古民家カフェ',
  'sento': '銭湯',
  'lacquerware': '工芸体験',
  'goldleaf': '工芸体験',
  'papermaking': '工芸体験',
  'dyeing': '工芸体験',
  'swordsmithing': '工芸体験',
  'woodworking': '工芸体験',
  'sugarcrafts': '工芸体験',
  'anime': 'アニメ',
  'manga': 'マンガ',
  'cosplay': 'コスプレ',
  'karaoke': 'カラオケ',
  'japanesegames': 'ゲーム',
  'jpop': 'J-POP・アイドル',
  'idolculture': 'J-POP・アイドル',
  'vocaloid': 'J-POP・アイドル',
  'japanesemov': '映画・ドラマ',
  'drama': '映画・ドラマ',
  'unagi': null,
  'gyudon': null,
  'tonkatsu': null,
  'conbinifood': null,
  'potatochips': null,
  'dagashi': null,
  'conbinisweets': null,
  'hogaku': null,
  'enka': null,
  'shoji': null,
  'fusuma': null,
  'tatami': null,
  'showaretro': null,
  'wamoderninterior': null,
  'fourseasons': null,
  'japanesecuisine': null,
  'other': null,
  'zazen': '座禅',
  'craftworkshops': '工芸体験',
  'japanesegardens': '日本庭園',
  'castles': '城めぐり',
  'sobaudon': 'そば・うどん',
  'okonomiyakitakoyaki': 'お好み焼き・たこ焼き',
  'homecooking': '家庭料理',
  'izakaya': '居酒屋',
  'sakeshochu': '日本酒・焼酎',
  'localspecialties': 'ご当地グルメ',
  'streetfood': '屋台グルメ',
  'kabukinoh': '歌舞伎・能',
  'games': 'ゲーム',
  'jpopidols': 'J-POP・アイドル',
  'moviesdramas': '映画・ドラマ',
}
const TAG_BY_VALUE = new Map<string, CultureTag>(CULTURE_TAGS.map(tag => [tag.value, tag]))

// 今の表示名（4 言語）→ 新しい値
const CURRENT_LABELS: Record<string, string> = {}
for (const tag of CULTURE_TAGS) {
  for (const label of Object.values(tag.labels)) {
    CURRENT_LABELS[label] = tag.value
  }
}

/**
 * 保存されている値 → 新しい値
 * - string：新しい値（日本語）
 * - null：消す値（昔の項目のうち無くなったもの・その他・personality:… / custom_culture:… の印つきの値）
 * - undefined：分からない値
 */
export function resolveCultureValue(stored: string | null | undefined): string | null | undefined {
  if (typeof stored !== 'string') return undefined
  const trimmed = stored.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('personality:') || trimmed.startsWith('custom_culture:')) return null
  if (TAG_BY_VALUE.has(trimmed)) return trimmed
  if (trimmed in CURRENT_LABELS) return CURRENT_LABELS[trimmed]
  if (trimmed in LEGACY_LABELS) return LEGACY_LABELS[trimmed]
  const key = trimmed.replace(/^culture\./, '').toLowerCase()
  if (key in LEGACY_KEYS) return LEGACY_KEYS[key]
  return undefined
}

/**
 * 新しい値 → その言語の表示名
 */
export function getCultureLabel(value: string, language: SupportedLanguage): string {
  const tag = TAG_BY_VALUE.get(value)
  if (!tag) return value
  return tag.labels[language] ?? tag.labels.ja
}

/**
 * 保存されている値（昔の値でもよい）→ 今の画面の言語の表示名
 * 消す値は ''（表示しない）、分からない値は原文のまま
 */
export function formatCultureValue(stored: string, language: SupportedLanguage = 'ja'): string {
  const resolved = resolveCultureValue(stored)
  if (resolved === null) return ''
  if (resolved === undefined) return typeof stored === 'string' ? stored : ''
  return getCultureLabel(resolved, language)
}

/**
 * 表示する一覧（カード・プロフィール用）：消す値を除き、同じ項目は 1 つにまとめ、順番を残す。
 * 分からない値は原文のまま出す
 */
export function getVisibleCultureLabels(values: readonly string[] | null | undefined, language: SupportedLanguage = 'ja'): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const stored of values ?? []) {
    const resolved = resolveCultureValue(stored)
    if (resolved === null) continue
    const id = resolved ?? (typeof stored === 'string' ? stored.trim() : '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    labels.push(resolved ? getCultureLabel(resolved, language) : id)
  }
  return labels
}

/**
 * 保存されている値の配列 → 新しい値の配列（編集画面の読み込み用）
 * 重複を消し、順番を残し、最大 max 個。消す値・分からない値は捨てる（捨てた値は dropped で返す）
 */
export function normalizeCultureValues(
  values: readonly string[] | null | undefined,
  max = 8
): { values: string[]; dropped: string[] } {
  const result: string[] = []
  const dropped: string[] = []
  for (const stored of values ?? []) {
    const resolved = resolveCultureValue(stored)
    if (!resolved) {
      if (typeof stored === 'string' && stored.trim()) dropped.push(stored)
      continue
    }
    if (!result.includes(resolved)) result.push(resolved)
  }
  return { values: result.slice(0, max), dropped }
}
