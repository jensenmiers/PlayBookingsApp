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
    let lastRequestedUserId: string | null = null

    const fetchUserProfileWithClient = async (client: ReturnType<typeof createClient>, userId: string, avatarUrl?: string) => {
      try {
        // Fetch user profile from database
        const { data: user, error } = await client
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

        // If avatar URL wasn't passed, try to fetch it from auth
        let finalAvatarUrl = avatarUrl
        if (!finalAvatarUrl) {
          const { data: { user: authUser } } = await client.auth.getUser()
          finalAvatarUrl = authUser?.user_metadata?.avatar_url || 
                          authUser?.user_metadata?.picture ||
                          authUser?.user_metadata?.avatar ||
                          undefined
        }

        // Merge avatar URL with user profile
        const userWithAvatar: User = {
          ...(user as User),
          avatar_url: finalAvatarUrl,
        }

        setState({ user: userWithAvatar, loading: false, error: null })
      } catch (error) {
        if (!mounted) return
        const message = error instanceof Error ? error.message : 'Failed to fetch user'
        console.error('Error fetching user profile:', error)
        setState({ user: null, loading: false, error: message })
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        try {
          const userId = session.user.id
          if (lastRequestedUserId === userId && state.loading === false && state.user?.id === userId) {
            return
          }
          lastRequestedUserId = userId

          // Extract avatar URL from session user metadata
          const avatarUrl = session.user.user_metadata?.avatar_url || 
                          session.user.user_metadata?.picture ||
                          session.user.user_metadata?.avatar ||
                          undefined

          if (_event === 'SIGNED_IN') {
            queueMicrotask(() => {
              ;(async () => {
                if (!mounted) return
                const fresh = createClient()
                await fetchUserProfileWithClient(fresh, userId, avatarUrl)
              })().catch((err) => {
                console.error('Error in microtask profile fetch:', err)
              })
            })
          } else {
            const client = createClient()
            await fetchUserProfileWithClient(client, userId, avatarUrl)
          }
        } catch (error) {
          console.error('Error in auth state change callback:', error)
          if (mounted) {
            setState({ user: null, loading: false, error: 'Failed to fetch user profile' })
          }
        }
      } else {
        setState({ user: null, loading: false, error: null })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}


