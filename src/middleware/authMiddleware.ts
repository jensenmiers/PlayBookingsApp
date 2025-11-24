/**
 * Authentication middleware for Supabase auth verification
 */

import { createClient } from '@/lib/supabase/server'
import { unauthorized } from '@/utils/errorHandling'
import type { User } from '@/types'

export interface AuthContext {
  userId: string
  user: User
  session: {
    access_token: string
    refresh_token?: string
  }
}

/**
 * Require authentication and return user context
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = createClient()
  
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  
  if (sessionError || !session || !session.user) {
    throw unauthorized('Authentication required')
  }
  
  // Get user profile from public.users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()
  
  if (userError || !user) {
    throw unauthorized('User profile not found')
  }
  
  return {
    userId: session.user.id,
    user: user as User,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    },
  }
}

/**
 * Get current user without throwing error (for optional auth)
 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  try {
    return await requireAuth()
  } catch {
    return null
  }
}

/**
 * Get session only
 */
export async function getSession() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}



