/**
 * Hook to get current authenticated user
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface UseCurrentUserState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useCurrentUser() {
  const [state, setState] = useState<UseCurrentUserState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          setState({ user: null, loading: false, error: null })
          return
        }

        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) throw error

        setState({ user: user as User, loading: false, error: null })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch user'
        setState({ user: null, loading: false, error: message })
      }
    }

    fetchUser()
  }, [])

  return state
}

