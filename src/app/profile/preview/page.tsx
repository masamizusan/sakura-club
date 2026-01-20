'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, User, Loader2, Globe } from 'lucide-react'
import { type SupportedLanguage } from '@/utils/language'
import { useUnifiedTranslation } from '@/utils/translations'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import { LanguageSkill, LANGUAGE_LABELS } from '@/types/profile'
import { resolveAvatarSrc } from '@/utils/imageResolver'
import { createClient } from '@/lib/supabase'

// 任意項目が表示すべき値かチェックするヘルパー関数
const shouldDisplayValue = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value !== '' && value !== 'none'
}

// 体型の英語値を多言語対応で変換するヘルパー関数
const getBodyTypeLabel = (value: string, t: any): string => {
  const bodyTypeLabels: Record<string, string> = {
    'slim': t('bodyType.slim'),
    'average': t('bodyType.average'),
    'muscular': t('bodyType.muscular'),
    'plump': t('bodyType.plump')
  }
  return bodyTypeLabels[value] || value
}

// 言語レベルの英語値を多言語対応で変換するヘルパー関数
const getLanguageLevelLabel = (value: string, t: any): string => {
  const levelLabels: Record<string, string> = {
    'none': t('levels.none'),
    'beginner': t('levels.beginner'),
    'elementary': t('levels.elementary'),
    'intermediate': t('levels.intermediate'),
    'upperIntermediate': t('levels.upperIntermediate'),
    'advanced': t('levels.advanced'),
    'native': t('levels.native')
  }
  return levelLabels[value] || value
}

// 同行者の英語値を多言語対応で変換するヘルパー関数
const getTravelCompanionLabel = (value: string, t: any): string => {
  const companionLabels: Record<string, string> = {
    'noEntry': t('companion.noEntry'),
    'alone': t('companion.alone'),
    'friend': t('companion.friend'),
    'family': t('companion.family'),
    'partner': t('companion.partner'),
    'solo': t('companion.alone'),
    'couple': t('companion.partner'),
    'friends': t('companion.friend'),
    'colleagues': t('companion.friend'),
    'group': t('companion.friend'),
    'other': t('companion.noEntry'),
    'no-entry': t('companion.noEntry')
  }
  return companionLabels[value] || value
}

// 職業の表示を多言語対応で変換するヘルパー関数
const getOccupationLabel = (value: string, t: any, isForeignMale: boolean = false): string => {
  const occupationLabels: Record<string, string> = {
    'noEntry': t('occupations.noEntry'),
    '経営者・役員': t('occupations.executiveManager'),
    '会社員': t('occupations.companyEmployee'),
    '公務員': t('occupations.publicServant'),
    '自営業': t('occupations.selfEmployed'),
    'フリーランス': t('occupations.freelance'),
    '学生': t('occupations.student'),
    '主婦': isForeignMale ? t('occupations.houseHusband') : t('occupations.housewife'),
    '主夫': isForeignMale ? t('occupations.houseHusband') : t('occupations.housewife'),
    '主婦、主夫': isForeignMale ? t('occupations.houseHusband') : t('occupations.housewife'),
    'その他': t('occupations.other')
  }
  return occupationLabels[value] || value
}

// 性格の表示を多言語対応で変換するヘルパー関数
const getPersonalityLabel = (value: string, t: any): string => {
  const personalityLabels: Record<string, string> = {
    // 日本語マッピング
    '優しい': t('personality.gentle'),
    '穏やか': t('personality.calm'),
    '寂しがりや': t('personality.lonely'),
    '落ち着いている': t('personality.composed'),
    '思いやりがある': t('personality.caring'),
    '謙虚': t('personality.humble'),
    '冷静': t('personality.cool'),
    '素直': t('personality.honest'),
    '明るい': t('personality.bright'),
    '親しみやすい': t('personality.friendly'),
    '面倒見が良い': t('personality.helpful'),
    '気が利く': t('personality.considerate'),
    '責任感がある': t('personality.responsible'),
    '決断力がある': t('personality.decisive'),
    '社交的': t('personality.sociable'),
    '負けず嫌い': t('personality.competitive'),
    '熱血': t('personality.passionate'),
    'インドア': t('personality.indoor'),
    'アクティブ': t('personality.active'),
    '知的': t('personality.intellectual'),
    '几帳面': t('personality.meticulous'),
    '楽観的': t('personality.optimistic'),
    'シャイ': t('personality.shy'),
    'マメ': t('personality.attentive'),
    'さわやか': t('personality.refreshing'),
    '天然': t('personality.natural'),
    'マイペース': t('personality.ownPace'),
    // 英語キー形式マッピング
    'gentle': t('personality.gentle'),
    'calm': t('personality.calm'),
    'lonely': t('personality.lonely'),
    'composed': t('personality.composed'),
    'caring': t('personality.caring'),
    'humble': t('personality.humble'),
    'cool': t('personality.cool'),
    'honest': t('personality.honest'),
    'bright': t('personality.bright'),
    'friendly': t('personality.friendly'),
    'helpful': t('personality.helpful'),
    'considerate': t('personality.considerate'),
    'responsible': t('personality.responsible'),
    'decisive': t('personality.decisive'),
    'sociable': t('personality.sociable'),
    'competitive': t('personality.competitive'),
    'passionate': t('personality.passionate'),
    'indoor': t('personality.indoor'),
    'active': t('personality.active'),
    'intellectual': t('personality.intellectual'),
    'meticulous': t('personality.meticulous'),
    'optimistic': t('personality.optimistic'),
    'shy': t('personality.shy'),
    'attentive': t('personality.attentive'),
    'refreshing': t('personality.refreshing'),
    'natural': t('personality.natural'),
    'ownPace': t('personality.ownPace'),
    // 大文字英語マッピング
    'Gentle': t('personality.gentle'),
    'Calm': t('personality.calm'),
    'Lonely': t('personality.lonely'),
    'Composed': t('personality.composed'),
    'Caring': t('personality.caring'),
    'Humble': t('personality.humble'),
    'Cool': t('personality.cool'),
    'Honest': t('personality.honest'),
    'Bright': t('personality.bright'),
    'Friendly': t('personality.friendly'),
    'Helpful': t('personality.helpful'),
    'Considerate': t('personality.considerate'),
    'Responsible': t('personality.responsible'),
    'Decisive': t('personality.decisive'),
    'Sociable': t('personality.sociable')
  }
  return personalityLabels[value] || value
}

// 都道府県の表示を多言語対応で変換するヘルパー関数
const getPrefectureLabel = (value: string, t: any): string => {
  const prefectureLabels: Record<string, string> = {
    '北海道': t('prefectures.hokkaido'),
    '青森県': t('prefectures.aomori'),
    '岩手県': t('prefectures.iwate'),
    '宮城県': t('prefectures.miyagi'),
    '秋田県': t('prefectures.akita'),
    '山形県': t('prefectures.yamagata'),
    '福島県': t('prefectures.fukushima'),
    '茨城県': t('prefectures.ibaraki'),
    '栃木県': t('prefectures.tochigi'),
    '群馬県': t('prefectures.gunma'),
    '埼玉県': t('prefectures.saitama'),
    '千葉県': t('prefectures.chiba'),
    '東京都': t('prefectures.tokyo'),
    '神奈川県': t('prefectures.kanagawa'),
    '新潟県': t('prefectures.niigata'),
    '富山県': t('prefectures.toyama'),
    '石川県': t('prefectures.ishikawa'),
    '福井県': t('prefectures.fukui'),
    '山梨県': t('prefectures.yamanashi'),
    '長野県': t('prefectures.nagano'),
    '岐阜県': t('prefectures.gifu'),
    '静岡県': t('prefectures.shizuoka'),
    '愛知県': t('prefectures.aichi'),
    '三重県': t('prefectures.mie'),
    '滋賀県': t('prefectures.shiga'),
    '京都府': t('prefectures.kyoto'),
    '大阪府': t('prefectures.osaka'),
    '兵庫県': t('prefectures.hyogo'),
    '奈良県': t('prefectures.nara'),
    '和歌山県': t('prefectures.wakayama'),
    '鳥取県': t('prefectures.tottori'),
    '島根県': t('prefectures.shimane'),
    '岡山県': t('prefectures.okayama'),
    '広島県': t('prefectures.hiroshima'),
    '山口県': t('prefectures.yamaguchi'),
    '徳島県': t('prefectures.tokushima'),
    '香川県': t('prefectures.kagawa'),
    '愛媛県': t('prefectures.ehime'),
    '高知県': t('prefectures.kochi'),
    '福岡県': t('prefectures.fukuoka'),
    '佐賀県': t('prefectures.saga'),
    '長崎県': t('prefectures.nagasaki'),
    '熊本県': t('prefectures.kumamoto'),
    '大分県': t('prefectures.oita'),
    '宮崎県': t('prefectures.miyazaki'),
    '鹿児島県': t('prefectures.kagoshima'),
    '沖縄県': t('prefectures.okinawa')
  }
  return prefectureLabels[value] || value
}

// 日本文化の表示を多言語対応で変換するヘルパー関数（86項目すべてに対応）
const getCultureLabel = (value: string, t: any): string => {
  const cultureLabels: Record<string, string> = {
    // ===== 伝統文化 =====
    '茶道': t('culture.teaCeremony'),
    '華道': t('culture.flowerArrangement'),
    '書道': t('culture.calligraphy'),
    '着物・浴衣': t('culture.kimono'),
    '着物': t('culture.kimono'),
    '浴衣': t('culture.kimono'),
    '和菓子': t('culture.wagashi'),
    '陶芸': t('culture.pottery'),
    '折り紙': t('culture.origami'),
    '盆栽': t('culture.bonsai'),
    '神社仏閣': t('culture.shrinesTemples'),
    '御朱印集め': t('culture.sealCollection'),
    '禅': t('culture.zen'),
    
    // ===== 食文化 =====
    '寿司': t('culture.sushi'),
    '天ぷら': t('culture.tempura'),
    'うなぎ': t('culture.unagi'),
    '牛丼': t('culture.gyudon'),
    'とんかつ': t('culture.tonkatsu'),
    'ラーメン': t('culture.ramen'),
    'お好み焼き': t('culture.okonomiyaki'),
    'たこ焼き': t('culture.takoyaki'),
    'カレーライス': t('culture.curry'),
    'コンビニフード': t('culture.conbiniFood'),
    'ポテトチップス': t('culture.potatoChips'),
    '出汁': t('culture.dashi'),
    '味噌': t('culture.miso'),
    '豆腐': t('culture.tofu'),
    '梅干し': t('culture.umeboshi'),
    '漬物': t('culture.pickles'),
    '日本酒': t('culture.sake'),
    '焼酎': t('culture.shochu'),
    'そば': t('culture.soba'),
    'うどん': t('culture.udon'),
    
    // ===== スイーツ =====
    '抹茶スイーツ': t('culture.matchaSweets'),
    '団子': t('culture.dango'),
    'たい焼き': t('culture.taiyaki'),
    '大判焼き': t('culture.obanyaki'),
    'わらび餅': t('culture.warabimochi'),
    'りんご飴': t('culture.candiedApple'),
    'わたあめ': t('culture.cottonCandy'),
    '駄菓子': t('culture.dagashi'),
    'コンビニスイーツ': t('culture.conbiniSweets'),
    
    // ===== 芸能・スポーツ =====
    '相撲': t('culture.sumo'),
    '剣道': t('culture.kendo'),
    '柔道': t('culture.judo'),
    '空手': t('culture.karate'),
    '弓道': t('culture.kyudo'),
    '合気道': t('culture.aikido'),
    '薙刀': t('culture.naginata'),
    '歌舞伎': t('culture.kabuki'),
    '能': t('culture.noh'),
    '日本舞踊': t('culture.japaneseDance'),
    '邦楽': t('culture.hogaku'),
    '演歌': t('culture.enka'),
    '太鼓': t('culture.taiko'),
    
    // ===== 季節・自然 =====
    '桜見物': t('culture.cherryBlossom'),
    '紅葉狩り': t('culture.autumnLeaves'),
    '温泉': t('culture.hotSprings'),
    '祭り': t('culture.festivals'),
    '祭り参加': t('culture.festivals'),
    '花火大会': t('culture.fireworks'),
    '雪景色': t('culture.snowScape'),
    '日本の四季': t('culture.fourSeasons'),
    '盆踊り': t('culture.bonDance'),
    '日本庭園散策': t('culture.gardenWalk'),
    
    // ===== 暮らし・空間 =====
    '障子': t('culture.shoji'),
    '襖の張り替え': t('culture.fusuma'),
    '畳': t('culture.tatami'),
    '古民家カフェ': t('culture.oldHouseCafe'),
    '銭湯': t('culture.sento'),
    '昭和レトロ家電': t('culture.showaRetro'),
    '和モダンインテリア': t('culture.waModernInterior'),
    
    // ===== 現代カルチャー =====
    'アニメ': t('culture.anime'),
    'マンガ': t('culture.manga'),
    'コスプレ': t('culture.cosplay'),
    '日本のゲーム': t('culture.japaneseGames'),
    'J-POP': t('culture.jpop'),
    'カラオケ': t('culture.karaoke'),
    '日本映画': t('culture.japaneseMov'),
    'ドラマ': t('culture.drama'),
    'ボーカロイド': t('culture.vocaloid'),
    'アイドル文化': t('culture.idolCulture'),
    
    // ===== 工芸・職人技 =====
    '漆器': t('culture.lacquerware'),
    '金箔貼り': t('culture.goldLeaf'),
    '和紙漉き': t('culture.paperMaking'),
    '染物': t('culture.dyeing'),
    '刀鍛冶': t('culture.swordSmithing'),
    '木工': t('culture.woodworking'),
    '飴細工': t('culture.sugarCrafts'),
    
    // ===== 英語キー形式（完全対応） =====
    'teaCeremony': t('culture.teaCeremony'),
    'flowerArrangement': t('culture.flowerArrangement'),
    'ikebana': t('culture.flowerArrangement'),
    'calligraphy': t('culture.calligraphy'),
    'kimono': t('culture.kimono'),
    'wagashi': t('culture.wagashi'),
    'pottery': t('culture.pottery'),
    'origami': t('culture.origami'),
    'bonsai': t('culture.bonsai'),
    'shrinesTemples': t('culture.shrinesTemples'),
    'sealCollection': t('culture.sealCollection'),
    'zen': t('culture.zen'),
    'sushi': t('culture.sushi'),
    'tempura': t('culture.tempura'),
    'unagi': t('culture.unagi'),
    'gyudon': t('culture.gyudon'),
    'tonkatsu': t('culture.tonkatsu'),
    'ramen': t('culture.ramen'),
    'okonomiyaki': t('culture.okonomiyaki'),
    'takoyaki': t('culture.takoyaki'),
    'curry': t('culture.curry'),
    'conbiniFood': t('culture.conbiniFood'),
    'potatoChips': t('culture.potatoChips'),
    'dashi': t('culture.dashi'),
    'miso': t('culture.miso'),
    'tofu': t('culture.tofu'),
    'umeboshi': t('culture.umeboshi'),
    'pickles': t('culture.pickles'),
    'sake': t('culture.sake'),
    'shochu': t('culture.shochu'),
    'soba': t('culture.soba'),
    'udon': t('culture.udon'),
    'matchaSweets': t('culture.matchaSweets'),
    'dango': t('culture.dango'),
    'taiyaki': t('culture.taiyaki'),
    'obanyaki': t('culture.obanyaki'),
    'warabimochi': t('culture.warabimochi'),
    'candiedApple': t('culture.candiedApple'),
    'cottonCandy': t('culture.cottonCandy'),
    'dagashi': t('culture.dagashi'),
    'conbiniSweets': t('culture.conbiniSweets'),
    'sumo': t('culture.sumo'),
    'kendo': t('culture.kendo'),
    'judo': t('culture.judo'),
    'karate': t('culture.karate'),
    'kyudo': t('culture.kyudo'),
    'aikido': t('culture.aikido'),
    'naginata': t('culture.naginata'),
    'kabuki': t('culture.kabuki'),
    'noh': t('culture.noh'),
    'japaneseDance': t('culture.japaneseDance'),
    'hogaku': t('culture.hogaku'),
    'enka': t('culture.enka'),
    'taiko': t('culture.taiko'),
    'cherryBlossom': t('culture.cherryBlossom'),
    'autumnLeaves': t('culture.autumnLeaves'),
    'hotSprings': t('culture.hotSprings'),
    'festivals': t('culture.festivals'),
    'festivalParticipation': t('culture.festivals'),
    'fireworks': t('culture.fireworks'),
    'snowScape': t('culture.snowScape'),
    'fourSeasons': t('culture.fourSeasons'),
    'bonDance': t('culture.bonDance'),
    'gardenWalk': t('culture.gardenWalk'),
    'shoji': t('culture.shoji'),
    'fusuma': t('culture.fusuma'),
    'tatami': t('culture.tatami'),
    'oldHouseCafe': t('culture.oldHouseCafe'),
    'sento': t('culture.sento'),
    'showaRetro': t('culture.showaRetro'),
    'waModernInterior': t('culture.waModernInterior'),
    'anime': t('culture.anime'),
    'manga': t('culture.manga'),
    'cosplay': t('culture.cosplay'),
    'japaneseGames': t('culture.japaneseGames'),
    'jpop': t('culture.jpop'),
    'karaoke': t('culture.karaoke'),
    'japaneseMov': t('culture.japaneseMov'),
    'drama': t('culture.drama'),
    'vocaloid': t('culture.vocaloid'),
    'idolCulture': t('culture.idolCulture'),
    'lacquerware': t('culture.lacquerware'),
    'goldLeaf': t('culture.goldLeaf'),
    'paperMaking': t('culture.paperMaking'),
    'dyeing': t('culture.dyeing'),
    'swordSmithing': t('culture.swordSmithing'),
    'woodworking': t('culture.woodworking'),
    'sugarCrafts': t('culture.sugarCrafts'),
    
    // ===== 大文字英語キー（完全対応） =====
    'TeaCeremony': t('culture.teaCeremony'),
    'FlowerArrangement': t('culture.flowerArrangement'),
    'Ikebana': t('culture.flowerArrangement'),
    'Calligraphy': t('culture.calligraphy'),
    'Kimono': t('culture.kimono'),
    'Wagashi': t('culture.wagashi'),
    'Pottery': t('culture.pottery'),
    'Origami': t('culture.origami'),
    'Bonsai': t('culture.bonsai'),
    'ShrinesTemples': t('culture.shrinesTemples'),
    'SealCollection': t('culture.sealCollection'),
    'Zen': t('culture.zen'),
    'Sushi': t('culture.sushi'),
    'Tempura': t('culture.tempura'),
    'Unagi': t('culture.unagi'),
    'Gyudon': t('culture.gyudon'),
    'Tonkatsu': t('culture.tonkatsu'),
    'Ramen': t('culture.ramen'),
    'Okonomiyaki': t('culture.okonomiyaki'),
    'Takoyaki': t('culture.takoyaki'),
    'Curry': t('culture.curry'),
    'ConbiniFood': t('culture.conbiniFood'),
    'PotatoChips': t('culture.potatoChips'),
    'Dashi': t('culture.dashi'),
    'Miso': t('culture.miso'),
    'Tofu': t('culture.tofu'),
    'Umeboshi': t('culture.umeboshi'),
    'Pickles': t('culture.pickles'),
    'Sake': t('culture.sake'),
    'Shochu': t('culture.shochu'),
    'Soba': t('culture.soba'),
    'Udon': t('culture.udon'),
    'MatchaSweets': t('culture.matchaSweets'),
    'Dango': t('culture.dango'),
    'Taiyaki': t('culture.taiyaki'),
    'Obanyaki': t('culture.obanyaki'),
    'Warabimochi': t('culture.warabimochi'),
    'CandiedApple': t('culture.candiedApple'),
    'CottonCandy': t('culture.cottonCandy'),
    'Dagashi': t('culture.dagashi'),
    'ConbiniSweets': t('culture.conbiniSweets'),
    'Sumo': t('culture.sumo'),
    'Kendo': t('culture.kendo'),
    'Judo': t('culture.judo'),
    'Karate': t('culture.karate'),
    'Kyudo': t('culture.kyudo'),
    'Aikido': t('culture.aikido'),
    'Naginata': t('culture.naginata'),
    'Kabuki': t('culture.kabuki'),
    'Noh': t('culture.noh'),
    'JapaneseDance': t('culture.japaneseDance'),
    'Hogaku': t('culture.hogaku'),
    'Enka': t('culture.enka'),
    'Taiko': t('culture.taiko'),
    'CherryBlossom': t('culture.cherryBlossom'),
    'AutumnLeaves': t('culture.autumnLeaves'),
    'HotSprings': t('culture.hotSprings'),
    'Festivals': t('culture.festivals'),
    'FestivalParticipation': t('culture.festivals'),
    'Fireworks': t('culture.fireworks'),
    'SnowScape': t('culture.snowScape'),
    'FourSeasons': t('culture.fourSeasons'),
    'BonDance': t('culture.bonDance'),
    'GardenWalk': t('culture.gardenWalk'),
    'Shoji': t('culture.shoji'),
    'Fusuma': t('culture.fusuma'),
    'Tatami': t('culture.tatami'),
    'OldHouseCafe': t('culture.oldHouseCafe'),
    'Sento': t('culture.sento'),
    'ShowaRetro': t('culture.showaRetro'),
    'WaModernInterior': t('culture.waModernInterior'),
    'Anime': t('culture.anime'),
    'Manga': t('culture.manga'),
    'Cosplay': t('culture.cosplay'),
    'JapaneseGames': t('culture.japaneseGames'),
    'Jpop': t('culture.jpop'),
    'JPOP': t('culture.jpop'),
    'Karaoke': t('culture.karaoke'),
    'JapaneseMov': t('culture.japaneseMov'),
    'Drama': t('culture.drama'),
    'Vocaloid': t('culture.vocaloid'),
    'IdolCulture': t('culture.idolCulture'),
    'Lacquerware': t('culture.lacquerware'),
    'GoldLeaf': t('culture.goldLeaf'),
    'PaperMaking': t('culture.paperMaking'),
    'Dyeing': t('culture.dyeing'),
    'SwordSmithing': t('culture.swordSmithing'),
    'Woodworking': t('culture.woodworking'),
    'SugarCrafts': t('culture.sugarCrafts'),
    
    // ===== プレフィックス付きキー（culture.完全対応） =====
    'culture.teaCeremony': t('culture.teaCeremony'),
    'culture.flowerArrangement': t('culture.flowerArrangement'),
    'culture.ikebana': t('culture.flowerArrangement'),
    'culture.calligraphy': t('culture.calligraphy'),
    'culture.kimono': t('culture.kimono'),
    'culture.wagashi': t('culture.wagashi'),
    'culture.pottery': t('culture.pottery'),
    'culture.origami': t('culture.origami'),
    'culture.bonsai': t('culture.bonsai'),
    'culture.shrinesTemples': t('culture.shrinesTemples'),
    'culture.sealCollection': t('culture.sealCollection'),
    'culture.zen': t('culture.zen'),
    'culture.sushi': t('culture.sushi'),
    'culture.tempura': t('culture.tempura'),
    'culture.unagi': t('culture.unagi'),
    'culture.gyudon': t('culture.gyudon'),
    'culture.tonkatsu': t('culture.tonkatsu'),
    'culture.ramen': t('culture.ramen'),
    'culture.okonomiyaki': t('culture.okonomiyaki'),
    'culture.takoyaki': t('culture.takoyaki'),
    'culture.curry': t('culture.curry'),
    'culture.conbiniFood': t('culture.conbiniFood'),
    'culture.potatoChips': t('culture.potatoChips'),
    'culture.dashi': t('culture.dashi'),
    'culture.miso': t('culture.miso'),
    'culture.tofu': t('culture.tofu'),
    'culture.umeboshi': t('culture.umeboshi'),
    'culture.pickles': t('culture.pickles'),
    'culture.sake': t('culture.sake'),
    'culture.shochu': t('culture.shochu'),
    'culture.soba': t('culture.soba'),
    'culture.udon': t('culture.udon'),
    'culture.matchaSweets': t('culture.matchaSweets'),
    'culture.dango': t('culture.dango'),
    'culture.taiyaki': t('culture.taiyaki'),
    'culture.obanyaki': t('culture.obanyaki'),
    'culture.warabimochi': t('culture.warabimochi'),
    'culture.candiedApple': t('culture.candiedApple'),
    'culture.cottonCandy': t('culture.cottonCandy'),
    'culture.dagashi': t('culture.dagashi'),
    'culture.conbiniSweets': t('culture.conbiniSweets'),
    'culture.sumo': t('culture.sumo'),
    'culture.kendo': t('culture.kendo'),
    'culture.judo': t('culture.judo'),
    'culture.karate': t('culture.karate'),
    'culture.kyudo': t('culture.kyudo'),
    'culture.aikido': t('culture.aikido'),
    'culture.naginata': t('culture.naginata'),
    'culture.kabuki': t('culture.kabuki'),
    'culture.noh': t('culture.noh'),
    'culture.japaneseDance': t('culture.japaneseDance'),
    'culture.hogaku': t('culture.hogaku'),
    'culture.enka': t('culture.enka'),
    'culture.taiko': t('culture.taiko'),
    'culture.cherryBlossom': t('culture.cherryBlossom'),
    'culture.autumnLeaves': t('culture.autumnLeaves'),
    'culture.hotSprings': t('culture.hotSprings'),
    'culture.festivals': t('culture.festivals'),
    'culture.festivalParticipation': t('culture.festivals'),
    'culture.fireworks': t('culture.fireworks'),
    'culture.snowScape': t('culture.snowScape'),
    'culture.fourSeasons': t('culture.fourSeasons'),
    'culture.bonDance': t('culture.bonDance'),
    'culture.gardenWalk': t('culture.gardenWalk'),
    'culture.shoji': t('culture.shoji'),
    'culture.fusuma': t('culture.fusuma'),
    'culture.tatami': t('culture.tatami'),
    'culture.oldHouseCafe': t('culture.oldHouseCafe'),
    'culture.sento': t('culture.sento'),
    'culture.showaRetro': t('culture.showaRetro'),
    'culture.waModernInterior': t('culture.waModernInterior'),
    'culture.anime': t('culture.anime'),
    'culture.manga': t('culture.manga'),
    'culture.cosplay': t('culture.cosplay'),
    'culture.japaneseGames': t('culture.japaneseGames'),
    'culture.jpop': t('culture.jpop'),
    'culture.karaoke': t('culture.karaoke'),
    'culture.japaneseMov': t('culture.japaneseMov'),
    'culture.drama': t('culture.drama'),
    'culture.vocaloid': t('culture.vocaloid'),
    'culture.idolCulture': t('culture.idolCulture'),
    'culture.lacquerware': t('culture.lacquerware'),
    'culture.goldLeaf': t('culture.goldLeaf'),
    'culture.paperMaking': t('culture.paperMaking'),
    'culture.dyeing': t('culture.dyeing'),
    'culture.swordSmithing': t('culture.swordSmithing'),
    'culture.woodworking': t('culture.woodworking'),
    'culture.sugarCrafts': t('culture.sugarCrafts'),
    
    // ===== その他のバリエーション =====
    '日本料理': t('culture.japaneseCuisine'),
    'ゲーム': t('culture.japaneseGames'),
    'games': t('culture.japaneseGames'),
    'Games': t('culture.japaneseGames'),
    'japaneseCuisine': t('culture.japaneseCuisine'),
    'JapaneseCuisine': t('culture.japaneseCuisine'),
    'martialArts': t('culture.martialArts'),
    'MartialArts': t('culture.martialArts'),
    '武道': t('culture.martialArts'),
    'お茶': t('culture.teaCeremony'),
    'tea': t('culture.teaCeremony'),
    'Tea': t('culture.teaCeremony'),
    'その他': t('culture.other'),
    'other': t('culture.other'),
    'Other': t('culture.other'),
    'culture.other': t('culture.other')
  }
  return cultureLabels[value] || value
}

// 国籍の表示を多言語対応で変換するヘルパー関数
const getNationalityLabel = (value: string, t: any): string => {
  const nationalityLabels: Record<string, string> = {
    'カナダ': t('nationalities.canada'),
    'アメリカ': t('nationalities.usa'),
    'イギリス': t('nationalities.uk'),
    'オーストラリア': t('nationalities.australia'),
    'ドイツ': t('nationalities.germany'),
    'フランス': t('nationalities.france'),
    'イタリア': t('nationalities.italy'),
    'スペイン': t('nationalities.spain'),
    '韓国': t('nationalities.korea'),
    '中国': t('nationalities.china'),
    'その他': t('nationalities.other')
  }
  return nationalityLabels[value] || value
}

function ProfilePreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // エラーハンドリング用の状態
  const [hasError, setHasError] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  // 🚨 未保存警告用フラグ（Option B実装）
  const isConfirmedRef = useRef(false)
  
  // 統一言語設定
  const { t, language: currentLanguage } = useUnifiedTranslation()
  const { currentLanguage: contextLanguage } = useLanguage()
  
  // 🌍 Preview専用翻訳辞書
  const previewTranslations: Record<string, Record<string, string>> = {
    ja: {
      headerTitle: 'プレビュー｜相手からの見え方'
    },
    en: {
      headerTitle: 'Preview | How others see you'
    },
    ko: {
      headerTitle: '미리보기｜상대가 보는 내 모습'
    },
    'zh-tw': {
      headerTitle: '預覽｜對方看到的樣子'
    }
  }
  
  // Preview専用翻訳関数
  const getPreviewTranslation = (key: string) => {
    const translations = previewTranslations[contextLanguage] || previewTranslations['ja']
    return translations[key] || previewTranslations['ja'][key] || key
  }
  
  // Supabase client for image resolution
  const supabase = createClient()

  // 🔒 セキュリティ強化: ユーザー固有のsessionStorageからデータを取得
  useEffect(() => {
    try {
      // まず新形式（ユーザー固有）のキーを試す
      const urlParams = new URLSearchParams(window.location.search)
      const userId = urlParams.get('userId') // URLパラメータからユーザーIDを取得
      const previewDataKey = userId ? `previewData_${userId}` : 'previewData'
      
      
      let savedData = sessionStorage.getItem(previewDataKey)
      
      // 新形式がない場合は旧形式も試す（後方互換性）
      if (!savedData && previewDataKey !== 'previewData') {
        savedData = sessionStorage.getItem('previewData')
      }
      
      // それでもない場合は全てのpreviewData関連キーを探す
      if (!savedData) {
        const allKeys = Object.keys(sessionStorage)
        const previewKeys = allKeys.filter(key => key.startsWith('previewData'))
        
        if (previewKeys.length > 0) {
          // 最初に見つかったpreviewDataキーを使用
          savedData = sessionStorage.getItem(previewKeys[0])
        }
      }
      
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setPreviewData(parsedData)
      } else {
        // フォールバック：URLパラメータから取得
        const fallbackData = {
          nickname: searchParams?.get('nickname') || 'ニックネーム未設定',
          age: searchParams?.get('age') || '18',
          birth_date: searchParams?.get('birth_date') || null,
          gender: searchParams?.get('gender') || '',
          nationality: searchParams?.get('nationality') || '',
          prefecture: searchParams?.get('prefecture') || '',
          occupation: searchParams?.get('occupation') || '',
          height: searchParams?.get('height') || '',
          body_type: searchParams?.get('body_type') || '',
          marital_status: searchParams?.get('marital_status') || '',
          english_level: searchParams?.get('english_level') || '',
          japanese_level: searchParams?.get('japanese_level') || '',
          self_introduction: searchParams?.get('self_introduction') || '',
          hobbies: [],
          personality: [],
          custom_culture: searchParams?.get('custom_culture') || '',
          image: searchParams?.get('image') || '',
          profile_image: searchParams?.get('profile_image') || null,
          // 外国人男性特有のフィールド
          planned_prefectures: [],
          planned_stations: [],
          visit_schedule: searchParams?.get('visit_schedule') || '',
          travel_companion: searchParams?.get('travel_companion') || ''
        }
        setPreviewData(fallbackData)
      }
    } catch (error) {
      console.error('❌ Error loading preview data:', error)
      setHasError(true)
    }
  }, [searchParams])

  // 🚨 beforeunload（タブ閉じ・リロード対策）
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isConfirmedRef.current) return // 保存済みなら警告しない
      e.preventDefault()
      e.returnValue = '変更内容が保存されていません。このページを離れますか？'
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // 🚨 popstate（ブラウザバック対策）
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isConfirmedRef.current) return // 保存済みなら警告しない
      const ok = window.confirm('変更内容が保存されていません。このページを離れますか？')
      if (!ok) {
        history.pushState(null, '', location.href)
      }
    }
    // 初期履歴エントリー追加
    history.pushState(null, '', location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // データが読み込まれていない場合
  if (!previewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
          <p className="text-gray-600">プレビューを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  // データから値を取得
  const {
    nickname = 'ニックネーム未設定',
    age = '18',
    gender = '',
    nationality = '',
    prefecture = '',
    occupation = '',
    height = '',
    body_type: bodyType = '',
    marital_status: maritalStatus = '',
    english_level: englishLevel = '',
    japanese_level: japaneseLevel = '',
    self_introduction: selfIntroduction = '',
    hobbies = [],
    // 外国人男性特有のフィールド
    planned_prefectures = [],
    planned_stations = [],
    visit_schedule = '',
    travel_companion = '',
    personality = [],
    custom_culture: customCulture = '',
    image: profileImage = '',
    photo_urls = [] // 🖼️ NEW: 複数画像対応
  } = previewData

  // エラー画面
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">プレビューエラー</h1>
          <p className="text-gray-600 mb-6">プレビューの読み込みに失敗しました。</p>
          <Button onClick={() => window.close()}>閉じる</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* ヘッダー */}
      <div className="bg-orange-500 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => window.close()}
              className="mr-4 text-white hover:bg-orange-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
            <h1 className="text-xl font-bold">{getPreviewTranslation('headerTitle')}</h1>
          </div>
          
          {/* 言語切り替えボタン */}
          <div className="flex items-center gap-2">
            <LanguageSelector variant="dark" size="md" showIcon={true} />
          </div>
        </div>
      </div>

      {/* プレビューコンテンツ */}
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto">
          {/* 🚨 未保存警告バナー（Option B実装 - 最優先） */}
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            ⚠️ この画面はまだ保存されていません。<br />
            「この内容で確定」を押すまで、画像や変更内容はDBに保存されません。
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* プロフィール画像 - 複数画像対応 */}
            <div className="relative aspect-square bg-gray-100">
              {(() => {
                // 🖼️ STEP 1: photo_urls優先表示（複数画像対応）
                let displayImage = null
                if (Array.isArray(photo_urls) && photo_urls.length > 0) {
                  displayImage = photo_urls[0] // メイン画像
                  console.log('🔄 プレビュー画像: photo_urls[0]使用:', displayImage)
                }
                // 🔧 STEP 2: 後方互換でprofileImage使用
                else if (profileImage) {
                  displayImage = profileImage
                  console.log('🔄 プレビュー画像: profileImage使用（後方互換）:', displayImage)
                }

                const avatarSrc = resolveAvatarSrc(displayImage, supabase)
                return avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="プロフィール"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <User className="w-24 h-24 text-gray-400" />
                  </div>
                )
              })()}
              
              {/* 🖼️ サブ画像表示（2枚目以降があれば小さく表示） */}
              {Array.isArray(photo_urls) && photo_urls.length > 1 && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {photo_urls.slice(1, 3).map((url, index) => {
                    const subAvatarSrc = resolveAvatarSrc(url, supabase)
                    return subAvatarSrc ? (
                      <img
                        key={`sub_${index}`}
                        src={subAvatarSrc}
                        alt={`サブ画像${index + 1}`}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                      />
                    ) : null
                  })}
                  {photo_urls.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-black bg-opacity-50 flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-white text-xs">+{photo_urls.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* プロフィール情報 */}
            <div className="p-6 space-y-4">
              {/* 基本情報 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{nickname}</h2>
                <div className="space-y-1">
                  <p className="text-lg text-gray-600">{t('profile.age')}: {age}</p>
                </div>
              </div>

              {/* 基本プロフィール */}
              <div className="space-y-3 text-sm">
                {(() => {
                  // 外国人男性判定
                  const isForeignMale = gender === 'male' && nationality && nationality !== '日本'
                  
                  return (
                    <>
                      {/* 1. 国籍（外国人男性の場合のみ）/ 居住地（日本人女性の場合） */}
                      {isForeignMale && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-20">{t('profile.nationality')}:</span>
                          <span className="text-gray-600">{getNationalityLabel(nationality, t)}</span>
                        </div>
                      )}
                      {gender === 'female' && prefecture && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-20">{t('profile.residence')}:</span>
                          <span className="text-gray-600">{getPrefectureLabel(prefecture, t)}</span>
                        </div>
                      )}
                      
                      {/* 2. 職業 */}
                      {shouldDisplayValue(occupation) && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-20">{t('profile.occupation')}:</span>
                          <span className="text-gray-600">{getOccupationLabel(occupation, t, isForeignMale)}</span>
                        </div>
                      )}
                    </>
                  )
                })()}
                
                {/* 3. 身長 */}
                {shouldDisplayValue(height) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.height')}:</span>
                    <span className="text-gray-600">{height}cm</span>
                  </div>
                )}
                
                {/* 4. 体型 */}
                {shouldDisplayValue(bodyType) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.bodyTypeLabel')}:</span>
                    <span className="text-gray-600">{getBodyTypeLabel(bodyType, t)}</span>
                  </div>
                )}
                
                {/* 5. 婚姻状況 */}
                {shouldDisplayValue(maritalStatus) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.marriageStatus')}:</span>
                    <span className="text-gray-600">{maritalStatus === 'single' ? t('maritalStatus.single') : t('maritalStatus.married')}</span>
                  </div>
                )}
                
                {/* 6. 使用言語情報（language_skills優先、レガシーフィールドは後方互換） */}
                {(() => {
                  // language_skillsを取得（URLパラメータまたはsessionStorageから）
                  let effectiveLanguageSkills: LanguageSkill[] = []
                  
                  try {
                    const languageSkillsParam = searchParams?.get('language_skills')
                    if (languageSkillsParam) {
                      effectiveLanguageSkills = JSON.parse(decodeURIComponent(languageSkillsParam))
                    }
                  } catch (e) {
                    console.warn('Language skills parse error from URL:', e)
                  }
                  
                  // 🚀 CRITICAL FIX: 正しいpreviewDataキーからsessionStorageを取得
                  if (!effectiveLanguageSkills.length && typeof window !== 'undefined') {
                    try {
                      // URLパラメータからユーザーIDを取得
                      const urlParams = new URLSearchParams(window.location.search)
                      const userId = urlParams.get('userId')
                      const previewDataKey = userId ? `previewData_${userId}` : 'previewData'
                      
                      console.log('🔍 Preview表示デバッグ:', {
                        userId,
                        previewDataKey,
                        'sessionStorageKeys': Object.keys(sessionStorage).filter(k => k.includes('preview'))
                      })
                      
                      const sessionData = window.sessionStorage.getItem(previewDataKey)
                      if (sessionData) {
                        const parsedData = JSON.parse(sessionData)
                        console.log('🔍 Preview表示: sessionDataから取得:', {
                          'parsedData.language_skills': parsedData.language_skills,
                          'language_skills存在': !!parsedData.language_skills,
                          'language_skills配列長': parsedData.language_skills?.length
                        })
                        
                        if (parsedData.language_skills) {
                          effectiveLanguageSkills = parsedData.language_skills
                          console.log('🔥 Preview表示: language_skills取得成功:', effectiveLanguageSkills)
                        }
                      } else {
                        console.log('🚨 Preview表示: sessionDataが見つかりません')
                      }
                    } catch (e) {
                      console.warn('Language skills session parse error:', e)
                    }
                  }
                  
                  // レガシーフィールドからの後方互換（language_skillsが空の場合のみ）
                  if (!effectiveLanguageSkills.length) {
                    if (shouldDisplayValue(japaneseLevel)) {
                      effectiveLanguageSkills.push({
                        language: 'ja',
                        level: japaneseLevel
                      })
                    }
                    if (shouldDisplayValue(englishLevel)) {
                      effectiveLanguageSkills.push({
                        language: 'en',
                        level: englishLevel
                      })
                    }
                  }
                  
                  // 統一された言語表示ラベルを使用
                  const getLanguageDisplayLabel = (lang: string): string => {
                    return LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS] || lang
                  }
                  
                  return effectiveLanguageSkills.length > 0 ? (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">{t('profile.languages')}</h3>
                      <div className="space-y-2">
                        {effectiveLanguageSkills.map((skill: LanguageSkill, index: number) => (
                          skill.language && skill.level && skill.language !== 'none' && skill.level !== 'none' ? (
                            <div key={index} className="flex items-center">
                              <span className="font-medium text-gray-700 w-20">{getLanguageDisplayLabel(skill.language)}:</span>
                              <span className="text-gray-600">{t(`profile.languageLevel.${skill.level}`) || skill.level}</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
                
                {/* 7. 訪問予定（外国人男性の場合） */}
                {gender === 'male' && shouldDisplayValue(visit_schedule) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.visitPlan')}:</span>
                    <span className="text-gray-600">
                      {(() => {
                        if (visit_schedule === 'undecided') return t('schedule.undecided');
                        if (visit_schedule === 'no-entry') return t('schedule.noEntry');
                        if (visit_schedule === 'currently-in-japan') return t('schedule.currentlyInJapan');

                        // beyond-YYYY 形式の処理
                        if (visit_schedule.startsWith('beyond-')) {
                          const year = visit_schedule.split('-')[1];
                          return `${t('schedule.after')} ${year}`;
                        }

                        // YYYY-season 形式の処理
                        const match = visit_schedule.match(/^(\d{4})-(spring|summer|autumn|winter)$/);
                        if (match) {
                          const [, year, season] = match;
                          const seasonKey = `seasons.${season}`;
                          return `${year} ${t(seasonKey)}`;
                        }

                        // フォールバック：そのまま表示
                        return visit_schedule;
                      })()}
                    </span>
                  </div>
                )}
                
                {/* 8. 同行者（外国人男性の場合） */}
                {gender === 'male' && shouldDisplayValue(travel_companion) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.companion')}:</span>
                    <span className="text-gray-600">{getTravelCompanionLabel(travel_companion, t)}</span>
                  </div>
                )}
                
                {/* 9. 行く予定の都道府県（外国人男性の場合） */}
                {gender === 'male' && planned_prefectures && planned_prefectures.length > 0 && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 w-20">{t('profile.plannedDestination')}:</span>
                    <span className="text-gray-600">{planned_prefectures.map((pref: string) => getPrefectureLabel(pref, t)).join(', ')}</span>
                  </div>
                )}

                {/* 訪問予定の駅（外国人男性の場合）- 順序は変更しない */}
                {gender === 'male' && planned_stations && planned_stations.length > 0 && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 w-20">{t('profile.plannedStationsLabel')}:</span>
                    <span className="text-gray-600">{planned_stations.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* 10. 自己紹介 */}
              {shouldDisplayValue(selfIntroduction) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('profile.selfIntroduction')}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selfIntroduction}
                  </p>
                </div>
              )}

              {/* 11. 性格 */}
              {personality.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('profile.personalityLabel')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {personality.map((trait: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                      >
                        {getPersonalityLabel(trait, t)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 12. 学びたい日本文化 */}
              {(hobbies.length > 0 || shouldDisplayValue(customCulture)) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('profile.learnJapaneseCulture')}</h3>
                  <div className="space-y-2">
                    {hobbies.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {hobbies.map((hobby: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-sakura-100 text-sakura-800 rounded-full text-xs"
                          >
                            {getCultureLabel(hobby, t)}
                          </span>
                        ))}
                      </div>
                    )}
                    {shouldDisplayValue(customCulture) && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-gray-700 text-sm">{customCulture}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* アクションボタン */}
              <div className="pt-4">
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={async () => {
                    // 🚀 CRITICAL: 指示書対応 - シンプルで確実な保存処理
                    console.log('🚀 プレビュー確定ボタンクリック - 保存処理開始')

                    try {
                      // 🚀 Step 1: ユーザー認証確認
                      const { createClient } = await import('@/lib/supabase')
                      const supabase = createClient()
                      const { data: { user }, error: userError } = await supabase.auth.getUser()
                      
                      if (!user) {
                        throw new Error('ユーザー情報の取得に失敗しました')
                      }

                      // 🚀 Step 2: 保存ペイロード準備（指示書対応）

                      // 🚨 SSOT: language_skills を必ずDBに保存（指示書対応）
                      let sessionLanguageSkills = []
                      try {
                        const urlParams = new URLSearchParams(window.location.search)
                        const userId = urlParams.get('userId') || user.id
                        const previewDataKey = userId ? `previewData_${userId}` : 'previewData'
                        let savedData = sessionStorage.getItem(previewDataKey)
                        if (!savedData) savedData = sessionStorage.getItem('previewData')
                        if (savedData) {
                          const sessionData = JSON.parse(savedData)
                          sessionLanguageSkills = Array.isArray(sessionData.language_skills) ? sessionData.language_skills : []
                        }
                      } catch (error) {
                        console.warn('⚠️ sessionStorage language_skills取得失敗:', error)
                      }
                      
                      const skills = previewData?.language_skills ?? sessionLanguageSkills ?? []
                      const normalizedLanguageSkills = Array.isArray(skills) ? skills : []
                      console.log('🚨 SSOT language_skills保存準備:', {
                        sessionSkills: sessionLanguageSkills,
                        previewSkills: previewData?.language_skills,
                        normalizedLength: normalizedLanguageSkills.length,
                        willSaveToDB: true
                      })

                      // 🚨 TASK C: photo_urls取得（0枚保存対応版）
                      // 🔥 修正: photo_urlsが空配列の場合はフォールバックしない（0枚保存を尊重）
                      let finalPhotoUrls: string[] = []
                      if (Array.isArray(photo_urls) && photo_urls.length > 0) {
                        // photo_urlsに有効な値がある
                        finalPhotoUrls = photo_urls
                        console.log('📸 TASK C: photo_urlsから画像使用:', photo_urls.length, '枚')
                      } else if (Array.isArray(photo_urls) && photo_urls.length === 0) {
                        // photo_urlsが明示的に空配列 → 0枚保存（フォールバックしない）
                        finalPhotoUrls = []
                        console.log('📸 TASK C: 0枚保存を検出 - photo_urls=[]')
                      } else if (previewData.profile_image || profileImage) {
                        // photo_urlsがない場合のみ後方互換フォールバック
                        finalPhotoUrls = [previewData.profile_image || profileImage]
                        console.log('📸 TASK C: 後方互換フォールバック - profile_image使用')
                      }

                      console.log("🚨 TASK C: CONFIRM SAVE PAYLOAD CHECK", {
                        finalPhotoUrlsCount: finalPhotoUrls?.length,
                        finalPhotoUrls,
                        avatarUrlWillBe: finalPhotoUrls.length > 0 ? finalPhotoUrls[0] : null,
                        previewData_photo_urls: previewData.photo_urls,
                        photo_urls_variable: photo_urls,
                        photo_urls_isArray: Array.isArray(photo_urls),
                        photo_urls_isEmpty: Array.isArray(photo_urls) && photo_urls.length === 0,
                        // 🔥 TASK C: 0枚時は空配列[]を送信（nullではない）
                        willSavePhotoUrlsAs: finalPhotoUrls.length === 0 ? '[] (empty array)' : `[${finalPhotoUrls.length} urls]`,
                        willSaveAvatarUrlAsNull: finalPhotoUrls.length === 0
                      })

                      const savePayload: any = {
                        id: user.id,
                        user_id: user.id,
                        // 基本情報
                        name: nickname || null,
                        bio: selfIntroduction || null,
                        age: age ? Number(age) : null,
                        birth_date: previewData.birth_date || previewData.birthday || previewData.dob || null,
                        gender: gender || null,
                        nationality: nationality || null,
                        residence: prefecture || null,  // 🚨 FIX: DBカラム名はresidence
                        // 🚀 CRITICAL: personality_tags必須（指示書対応）
                        personality_tags: personality && personality.length > 0
                          ? personality.filter((p: string) => p && p.trim()).map((p: string) => p.trim())
                          : null,
                        // 🚀 CRITICAL: interests必須（指示書対応）
                        interests: hobbies && hobbies.length > 0 ? hobbies : null,
                        // 🚨 SSOT: language_skills必須DB保存（指示書対応）
                        language_skills: normalizedLanguageSkills,
                        // 🚨 TASK C FIX: photo_urls必須（0枚保存時は空配列[]を確実にDBに送信）
                        // 🔥 修正: nullではなく空配列[]を送信することで、saveProfileToDbで正しく処理される
                        photo_urls: finalPhotoUrls, // 0枚=[], N枚=[url1,...urlN]
                        // 🚀 CRITICAL: avatar_url必須（指示書対応）
                        avatar_url: finalPhotoUrls.length > 0 ? finalPhotoUrls[0] : null,
                        // その他項目
                        occupation: occupation || null,
                        height: height || null,
                        body_type: bodyType || null,
                        marital_status: maritalStatus || null,
                        // 外国人男性専用
                        visit_schedule: visit_schedule || null,
                        travel_companion: travel_companion || null,
                        planned_prefectures: planned_prefectures || null,
                        planned_stations: planned_stations || null,
                        updated_at: new Date().toISOString()
                      }

                      // 🔧 CRITICAL: allowlistによるDBスキーマ厳格制限（指示書対応）
                      const ALLOWED_PROFILE_KEYS = new Set([
                        'id',
                        'user_id',
                        'name',
                        'bio',
                        'age',
                        'birth_date',
                        'gender',
                        'nationality',
                        'residence',          // 居住地（都道府県など）
                        'personality_tags',
                        'interests',
                        'avatar_url',
                        'occupation',
                        'height',
                        'body_type',
                        'marital_status',
                        'visit_schedule',
                        'travel_companion',
                        'planned_prefectures', // 訪問予定（これが本命）
                        'japanese_level',
                        'english_level',
                        'membership_type',
                        'is_verified',
                        // 🚨 SSOT追加: language_skillsをDB永続化（指示書対応）
                        'language_skills',
                        // 🚨 CRITICAL FIX: photo_urlsをwhitelistに追加（根本問題解決）
                        'photo_urls'
                        // 'updated_at' ← 絶対に入れない（DB側で自動更新に任せる）
                      ])

                      // ② 念のためブラックリストで最終除去（今後の地雷対策）
                      const BLOCKED_KEYS = new Set(['updated_at', 'prefecture', 'planned_stations'])

                      const sanitizedPayload = Object.fromEntries(
                        Object.entries(savePayload).filter(([k]) => ALLOWED_PROFILE_KEYS.has(k) && !BLOCKED_KEYS.has(k))
                      )

                      // デバッグ：落としたキーを可視化（次の地雷発見が一瞬になる）
                      const droppedKeys = Object.keys(savePayload).filter(k => !ALLOWED_PROFILE_KEYS.has(k))
                      console.log('🧹 UPSERT SANITIZE', {
                        allowed_count: Object.keys(sanitizedPayload).length,
                        blocked_present: Object.keys(savePayload).filter(k => BLOCKED_KEYS.has(k)),
                        payload_keys: Object.keys(sanitizedPayload),
                        residence_present: 'residence' in sanitizedPayload,
                        planned_prefectures_present: 'planned_prefectures' in sanitizedPayload,
                      })

                      // 🚀 Step 3: upsert直前ログ（指示書①対応）
                      console.log("🚨 UPSERT PAYLOAD", {
                        photo_urls_count: Array.isArray(sanitizedPayload.photo_urls) ? sanitizedPayload.photo_urls.length : 0,
                        photo_urls: sanitizedPayload.photo_urls,
                        avatar_url: sanitizedPayload.avatar_url,
                        personality_tags: sanitizedPayload.personality_tags,
                        interests: sanitizedPayload.interests,
                        payload_keys: Object.keys(sanitizedPayload),
                        residence_present: 'residence' in sanitizedPayload,
                        planned_prefectures_present: 'planned_prefectures' in sanitizedPayload,
                        full_payload: sanitizedPayload
                      })

                      // 🚨 SSOT保存保証ログ（指示書対応）
                      console.log('🚀 PROFILE UPSERT FINAL PAYLOAD CHECK', {
                        has_language_skills: 'language_skills' in sanitizedPayload,
                        language_skills: sanitizedPayload.language_skills,
                        isArray: Array.isArray(sanitizedPayload.language_skills),
                        length: Array.isArray(sanitizedPayload.language_skills) ? sanitizedPayload.language_skills.length : null,
                      })

                      // 🚨 Step 4: 統一パイプライン経由でBase64遮断保証upsert（指示書準拠）
                      console.log('📍 profiles write entry: profile/preview confirm')
                      
                      // 🔍 保存前詳細ログ（avatar変換追跡用）
                      const preConversionAvatarUrl = sanitizedPayload.avatar_url
                      console.log('🔍 PRE-CONVERSION AVATAR DEBUG:', {
                        avatar_url_exists: !!preConversionAvatarUrl,
                        avatar_url_type: typeof preConversionAvatarUrl,
                        avatar_url_length: (typeof preConversionAvatarUrl === 'string' ? preConversionAvatarUrl.length : 0),
                        avatar_url_preview: (typeof preConversionAvatarUrl === 'string' ? preConversionAvatarUrl.substring(0, 30) + '...' : 'null'),
                        is_data_url: (typeof preConversionAvatarUrl === 'string' && preConversionAvatarUrl.startsWith('data:image/')),
                        is_http_url: /^https?:\/\//.test(preConversionAvatarUrl as string || '')
                      })
                      
                      const { upsertProfile } = await import('@/utils/saveProfileToDb')
                      const saveResult = await upsertProfile(
                        supabase,
                        user.id,
                        sanitizedPayload,
                        'profile/preview/page.tsx/confirm',
                        ['id']
                      )
                      
                      // 🔍 保存後詳細ログ（結果確認用）
                      console.log('🔍 POST-CONVERSION RESULT:', {
                        save_success: saveResult.success,
                        save_error: saveResult.error || 'none',
                        final_data_count: saveResult.data?.length || 0
                      })

                      if (!saveResult.success) {
                        console.error('❌ PROFILE UPSERT FAILED via unified pipeline')
                        console.error('❌ Error:', saveResult.error)
                        console.error('❌ PAYLOAD KEYS', Object.keys(sanitizedPayload))
                        throw new Error(saveResult.error || 'Profile upsert failed')
                      }

                      // ✅ Step 5: upsert完了ログ（指示書対応）
                      console.log('✅ PROFILE UPSERT SUCCESS', {
                        userId: user.id,
                        timestamp: new Date().toISOString(),
                        saved_personality_tags: sanitizedPayload.personality_tags,
                        saved_interests: sanitizedPayload.interests,
                        planned_stations_excluded: true,
                        prefecture_excluded: true,
                        residence_preserved: 'residence' in sanitizedPayload
                      })

                      // 🚨 CRITICAL FIX: 5-2 DB結果による状態同期（再発防止）
                      if (saveResult.data && saveResult.data[0]) {
                        const savedProfile = saveResult.data[0]
                        console.log('🔄 DB結果による状態同期開始:', {
                          db_photo_urls: savedProfile.photo_urls,
                          db_avatar_url: savedProfile.avatar_url,
                          db_photo_urls_count: Array.isArray(savedProfile.photo_urls) ? savedProfile.photo_urls.length : 0
                        })
                        
                        // sessionStorageの保存データをDB結果で上書き
                        const previewDataKey = `previewData_${user?.id || 'anonymous'}`
                        try {
                          const currentPreviewData = sessionStorage.getItem(previewDataKey)
                          if (currentPreviewData) {
                            const parsedData = JSON.parse(currentPreviewData)
                            // 🚨 B. DB値で重要フィールドを上書き（安易フォールバック排除）
                            if (Array.isArray(savedProfile.photo_urls)) {
                              parsedData.photo_urls = savedProfile.photo_urls
                            }
                            // ❌ 禁止: photo_urls = savedProfile.photo_urls || [] ← 空配列上書き原因
                            parsedData.avatar_url = savedProfile.avatar_url
                            parsedData.image = savedProfile.avatar_url || savedProfile.photo_urls?.[0] || parsedData.image
                            
                            sessionStorage.setItem(previewDataKey, JSON.stringify(parsedData))
                            console.log('✅ SessionStorage更新完了:', {
                              updated_photo_urls: parsedData.photo_urls,
                              updated_count: Array.isArray(parsedData.photo_urls) ? parsedData.photo_urls.length : 0
                            })
                          }
                        } catch (sessionError) {
                          console.warn('⚠️ SessionStorage更新失敗（影響なし）:', sessionError)
                        }
                      }

                      // 🎯 Step 6: upsert完了後にMyPage遷移（指示書対応）
                      console.log('🎯 Profile保存完了 - MyPageに遷移')

                      // 🚨 保存完了フラグ設定（未保存警告を無効化）
                      isConfirmedRef.current = true

                      if (window.opener) {
                        window.opener.location.href = '/mypage'
                        window.close()
                      } else {
                        window.location.href = '/mypage'
                      }

                    } catch (error) {
                      console.error('❌ CRITICAL: Profile保存処理でエラー:', error)
                      alert('プロフィールの保存に失敗しました: ' + (error as Error).message)
                      return // エラー時は遷移しない
                    }
                  }}
                >
                  {t('profile.updateProfile')}
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
          <p className="text-gray-600">プレビューを読み込んでいます...</p>
        </div>
      </div>
    }>
      <ProfilePreviewContent />
    </Suspense>
  )
}