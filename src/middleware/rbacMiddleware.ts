/**
 * Role-based access control middleware
 */

import { forbidden } from '@/utils/errorHandling'
import type { AuthContext } from './authMiddleware'

type UserCapability = 'renter' | 'venue_owner' | 'admin'

/**
 * Require specific capability
 */
export function requireRole(authContext: AuthContext, allowedCapabilities: UserCapability[]): void {
  const user = authContext.user

  const hasCapability = allowedCapabilities.some((capability) => {
    if (capability === 'admin') return user.is_admin
    if (capability === 'venue_owner') return user.is_venue_owner
    if (capability === 'renter') return user.is_renter
    return false
  })

  if (!hasCapability) {
    throw forbidden(`Access denied. Required capabilities: ${allowedCapabilities.join(', ')}`)
  }
}

/**
 * Require renter or venue owner capability
 */
export function requireRenterOrOwner(authContext: AuthContext): void {
  const allowedCapabilities: UserCapability[] = ['renter', 'venue_owner']
  requireRole(authContext, allowedCapabilities)
}

/**
 * Require admin capability
 */
export function requireAdmin(authContext: AuthContext): void {
  requireRole(authContext, ['admin'])
}

/**
 * Check if user owns a venue
 */
export async function checkVenueOwnership(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  venueId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('venues')
    .select('owner_id')
    .eq('id', venueId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  return data.owner_id === userId
}

/**
 * Check if user owns a booking (as renter) or owns the venue
 */
export async function checkBookingAccess(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  bookingId: string,
  userId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; isRenter: boolean }> {
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('renter_id, venue_id, venues!inner(owner_id)')
    .eq('id', bookingId)
    .single()
  
  if (error || !booking) {
    return { hasAccess: false, isOwner: false, isRenter: false }
  }
  
  // Handle the joined venue data - Supabase returns it as an array or object
  const venueData = Array.isArray(booking.venues) ? booking.venues[0] : booking.venues
  const venue = venueData as { owner_id: string } | null
  
  if (!venue) {
    return { hasAccess: false, isOwner: false, isRenter: false }
  }
  
  const isRenter = booking.renter_id === userId
  const isOwner = venue.owner_id === userId
  
  return {
    hasAccess: isRenter || isOwner,
    isOwner,
    isRenter,
  }
}

/**
 * Require booking access (renter or venue owner)
 */
export async function requireBookingAccess(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  bookingId: string,
  authContext: AuthContext
): Promise<void> {
  // Admins have access to everything
  if (authContext.user.is_admin) {
    return
  }
  
  const access = await checkBookingAccess(supabase, bookingId, authContext.userId)
  
  if (!access.hasAccess) {
    throw forbidden('You do not have access to this booking')
  }
}

