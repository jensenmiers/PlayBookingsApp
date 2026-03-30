import type { SupabaseClient } from '@supabase/supabase-js'
import type { VenueMedia } from '@/types'

type VenueImageWriteRow = Pick<
  VenueMedia,
  | 'venue_id'
  | 'media_type'
  | 'storage_provider'
  | 'bucket_name'
  | 'object_path'
  | 'public_url'
  | 'sort_order'
  | 'is_primary'
>

const SUPABASE_PUBLIC_OBJECT_PATH = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/

function getStorageInfoFromPublicUrl(publicUrl: string): {
  bucket_name: string | null
  object_path: string | null
} {
  const match = publicUrl.match(SUPABASE_PUBLIC_OBJECT_PATH)
  return {
    bucket_name: match?.[1] ?? null,
    object_path: match?.[2] ?? null,
  }
}

export function buildVenueImageRows(args: {
  venueId: string
  photoUrls: string[]
}): VenueImageWriteRow[] {
  return args.photoUrls.map((publicUrl, index) => {
    const storageInfo = getStorageInfoFromPublicUrl(publicUrl)

    return {
      venue_id: args.venueId,
      media_type: 'image',
      storage_provider: 'supabase',
      bucket_name: storageInfo.bucket_name,
      object_path: storageInfo.object_path,
      public_url: publicUrl,
      sort_order: index,
      is_primary: index === 0,
    }
  })
}

export async function replaceVenueImages(
  supabase: Pick<SupabaseClient, 'from'>,
  args: {
    venueId: string
    photoUrls: string[]
  }
): Promise<void> {
  const rows = buildVenueImageRows(args)

  const { error: deleteError } = await supabase
    .from('venue_media')
    .delete()
    .eq('venue_id', args.venueId)

  if (deleteError) {
    throw new Error(`Failed to clear venue media: ${deleteError.message}`)
  }

  if (rows.length === 0) {
    return
  }

  const { error: insertError } = await supabase
    .from('venue_media')
    .insert(
      rows.map((row) => ({
        ...row,
        migrated_from_legacy_photos: false,
      }))
    )

  if (insertError) {
    throw new Error(`Failed to write venue media: ${insertError.message}`)
  }
}
