/**
 * Hook to get current authenticated user
 */

'use client'

import { useState, useEffect } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
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
    const supabase = createClient()
    let mounted = true

    const fetchUserProfile = async (userId: string) => {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (!mounted) return

        if (error) {
          // Handle case where user profile doesn't exist
          // PGRST116 = no rows returned, but also check message for other variations
          const errorCode = (error as PostgrestError | null)?.code
          const errorMessage = error.message?.toLowerCase() || ''
          
          if (
            errorCode === 'PGRST116' || 
            errorMessage.includes('no rows') ||
            errorMessage.includes('not found') ||
            errorCode === '42P01' // relation does not exist (shouldn't happen but handle it)
          ) {
            console.warn('User profile not found in database:', userId)
            setState({ user: null, loading: false, error: null })
            return
          }
          
          console.error('Error fetching user profile:', error)
          throw error
        }

        if (!user) {
          setState({ user: null, loading: false, error: null })
          return
        }

        setState({ user: user as User, loading: false, error: null })
      } catch (error) {
        if (!mounted) return
        const message = error instanceof Error ? error.message : 'Failed to fetch user'
        console.error('Error fetching user profile:', error)
        setState({ user: null, loading: false, error: message })
      }
    }

    const fetchUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session?.user) {
          setState({ user: null, loading: false, error: null })
          return
        }

        await fetchUserProfile(session.user.id)
      } catch (error) {
        if (!mounted) return
        const message = error instanceof Error ? error.message : 'Failed to fetch user'
        console.error('Error fetching user:', error)
        setState({ user: null, loading: false, error: message })
      }
    }

    fetchUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        try {
          await fetchUserProfile(session.user.id)
        } catch (error) {
          console.error('Error in auth state change callback:', error)
        }
      } else {
        setState({ user: null, loading: false, error: null })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}


