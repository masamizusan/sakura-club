import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useSubscription() {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSubscription = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .single()

      if (data && data.status === 'active') {
        const now = new Date()
        const periodEnd = new Date(data.current_period_end)
        setIsSubscribed(periodEnd > now)
      } else {
        setIsSubscribed(false)
      }
      setLoading(false)
    }

    checkSubscription()
  }, [])

  return { isSubscribed, loading }
}
