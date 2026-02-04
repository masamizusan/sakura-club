// 要件D: singleton に委譲（Multiple GoTrueClient 問題の根本解決）
// @/lib/supabase の singleton を再 export することで、
// どの import パスを使っても同一インスタンスが返る。
export { createClient } from '@/lib/supabase'
