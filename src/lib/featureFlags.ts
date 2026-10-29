// 機能の公開・非公開を切り替えるフラグ（画面と API で共通に使う）

// 体験機能：企画が固まるまで公開しない
// true の間は「存在しない」扱い（#20・#45）：/experiences 以下のページは 404（src/app/experiences/layout.tsx）、
// 体験・レビューの API は 404（src/lib/server/experiencesGate.ts）、サイトマップにも載せない
// 公開時は false に戻し、ナビゲーションに入口を追加する
export const EXPERIENCES_COMING_SOON = true

// #57 Google・Facebook ログイン：未実装（ボタンに処理が無い）のため、公開まで隠す
// false の間は、ログイン画面の「または」の区切り線と 2 つのボタンを出さない（コードは残す）
export const SOCIAL_LOGIN_ENABLED = false
