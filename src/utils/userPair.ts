/**
 * user1_id / user2_id を順序固定で返す（小さい方が user1_id）
 *
 * matches テーブルは「1ペア1行」管理であり、(user1_id, user2_id) を
 * 昇順 UUID で順序固定する。conversations の user_pair_key generated column
 * (LEAST/GREATEST で生成) とも整合させるため、JS 側でも `<` 演算子による
 * 昇順比較を用いる（localeCompare 等への変更は禁止：locale 依存になり
 * Postgres LEAST/GREATEST と挙動が乖離するリスクがあるため）。
 *
 * 純粋関数（環境変数・Supabase クライアント不使用）なので
 * Server / Client 両方から import 安全。
 */
export function getOrderedUserIds(idA: string, idB: string): { user1_id: string; user2_id: string } {
  if (idA < idB) {
    return { user1_id: idA, user2_id: idB }
  } else {
    return { user1_id: idB, user2_id: idA }
  }
}
