/**
 * Venues API Routes
 * GET /api/venues - List venues with pagination and search
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/utils/errorHandling'
import type { PaginatedResponse } from '@/types/api'
import type { Venue } from '@/types'
import {
  isMissingVenueMediaQueryError,
  normalizeVenueCollectionWithMedia,
  VENUE_SELECT_WITH_MEDIA,
} from '@/lib/venueMedia'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)))
    const search = searchParams.get('search')?.trim() || null

    const applySearch = (query: any) => {
      let nextQuery = query

      if (search) {
        nextQuery = nextQuery.or(
          `name.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`
        )
      }

      return nextQuery
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    let { data, error, count } = await applySearch(
      supabase
        .from('venues')
        .select(VENUE_SELECT_WITH_MEDIA, { count: 'exact' })
        .eq('is_active', true)
    )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error && isMissingVenueMediaQueryError(error)) {
      ;({ data, error, count } = await applySearch(
        supabase
          .from('venues')
          .select('*', { count: 'exact' })
          .eq('is_active', true)
      )
        .order('created_at', { ascending: false })
        .range(from, to))
    }

    if (error) {
      throw error
    }

    const total = count || 0
    const total_pages = Math.ceil(total / limit)

    const response: PaginatedResponse<Venue> = {
      success: true,
      data: normalizeVenueCollectionWithMedia(data),
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
