import { spawn } from 'child_process'
import type { SupabaseClient } from '@supabase/supabase-js'
import { replaceVenueImages } from '@/lib/venueMediaWrite'

export const VENUE_MEDIA_BUCKET = 'venue-photos'
export const DEFAULT_APP_URL = 'https://www.playbookings.com'
export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

export type PublishVenueGalleryArgs = {
  venueName: string
  apply: boolean
  openBrowser: boolean
}

export type PublishVenueGalleryVenue = {
  id: string
  name: string
  slug: string
}

export type VenueGalleryPlanEntry = {
  filename: string
  objectPath: string
  publicUrl: string
  isHero: boolean
}

export type VenueGalleryPlan = {
  venueId: string
  venueName: string
  venueSlug: string
  routeSlug: string
  reviewUrl: string
  entries: VenueGalleryPlanEntry[]
}

type VenueMediaVerificationRow = {
  public_url: string
  sort_order: number
  is_primary: boolean
}

type QueryBuilderLike = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{
        data: VenueMediaVerificationRow[] | null
        error: { message?: string } | null
      }>
    }
  }
}

type StorageListItem = {
  name: string
  id?: string | null
}

type StorageBucketLike = {
  list: (
    path: string,
    options?: { limit?: number; sortBy?: { column: string; order: 'asc' | 'desc' } }
  ) => Promise<{ data: StorageListItem[] | null; error: { message?: string } | null }>
}

export type VenueGallerySupabaseClient = Pick<SupabaseClient, 'from' | 'storage'> & {
  from: (table: string) => QueryBuilderLike
  storage: {
    from: (bucket: string) => StorageBucketLike
  }
}

export function slugifyVenueName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parsePublishVenueGalleryArgs(argv: string[]): PublishVenueGalleryArgs {
  let venueName = ''
  let apply = false
  let openBrowser = false

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--venue') {
      venueName = argv[index + 1] || ''
      index++
      continue
    }

    if (arg === '--apply') {
      apply = true
      continue
    }

    if (arg === '--open-browser') {
      openBrowser = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!venueName) {
    throw new Error('Missing required --venue argument')
  }

  if (openBrowser && !apply) {
    throw new Error('--open-browser requires --apply')
  }

  return {
    venueName,
    apply,
    openBrowser,
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function isSupportedImageFilename(filename: string): boolean {
  const lowerName = filename.toLowerCase()
  return SUPPORTED_IMAGE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
}

function isHeroFilename(filename: string): boolean {
  const lowerName = filename.toLowerCase()
  return lowerName === 'hero.jpg'
    || lowerName === 'hero.jpeg'
    || lowerName === 'hero.png'
    || lowerName === 'hero.webp'
}

function compareGalleryFilenames(left: string, right: string): number {
  const leftHero = isHeroFilename(left)
  const rightHero = isHeroFilename(right)

  if (leftHero && !rightHero) {
    return -1
  }

  if (!leftHero && rightHero) {
    return 1
  }

  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}

export async function buildVenueGalleryPlan(args: {
  venue: PublishVenueGalleryVenue
  supabase: VenueGallerySupabaseClient
  supabaseUrl: string
  appUrl?: string
}): Promise<VenueGalleryPlan> {
  const bucket = args.supabase.storage.from(VENUE_MEDIA_BUCKET)
  const { data: storageObjects, error } = await bucket.list(args.venue.slug, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    throw new Error(`Failed to list storage objects for ${args.venue.slug}: ${error.message || 'Unknown error'}`)
  }

  const entries = (storageObjects || [])
    .filter((item) => Boolean(item.name) && item.id !== null)
    .map((item) => item.name)
    .filter(isSupportedImageFilename)
    .sort(compareGalleryFilenames)
    .map((filename) => {
      const objectPath = `${args.venue.slug}/${filename}`
      return {
        filename,
        objectPath,
        publicUrl: `${normalizeBaseUrl(args.supabaseUrl)}/storage/v1/object/public/${VENUE_MEDIA_BUCKET}/${objectPath}`,
        isHero: isHeroFilename(filename),
      }
    })

  if (entries.length === 0) {
    throw new Error(
      `No supported images found in ${VENUE_MEDIA_BUCKET}/${args.venue.slug}. Supported formats: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}`
    )
  }

  const routeSlug = slugifyVenueName(args.venue.name)
  const appUrl = normalizeBaseUrl(args.appUrl || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL)

  return {
    venueId: args.venue.id,
    venueName: args.venue.name,
    venueSlug: args.venue.slug,
    routeSlug,
    reviewUrl: `${appUrl}/venue/${routeSlug}`,
    entries,
  }
}

async function defaultOpenUrl(url: string): Promise<void> {
  const command = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open'
  const args = process.platform === 'win32'
    ? ['/c', 'start', '', url]
    : [url]

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    })
    child.on('error', reject)
    child.unref()
    resolve()
  })
}

export async function runVenueGalleryPublish(args: {
  apply: boolean
  openBrowser: boolean
  plan: VenueGalleryPlan
  supabase: VenueGallerySupabaseClient
  openUrl?: (url: string) => Promise<void>
}): Promise<
  | { mode: 'preview'; plan: VenueGalleryPlan }
  | {
      mode: 'applied'
      plan: VenueGalleryPlan
      verification: {
        storageObjects: string[]
        rows: VenueMediaVerificationRow[]
      }
      browserOpened: boolean
    }
> {
  if (!args.apply) {
    return {
      mode: 'preview',
      plan: args.plan,
    }
  }

  try {
    await replaceVenueImages(args.supabase as never, {
      venueId: args.plan.venueId,
      photoUrls: args.plan.entries.map((entry) => entry.publicUrl),
    })
  } catch (error) {
    throw new Error(
      `Failed to write venue media from storage: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  const bucket = args.supabase.storage.from(VENUE_MEDIA_BUCKET)
  const { data: storageObjects, error: storageError } = await bucket.list(args.plan.venueSlug, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (storageError) {
    throw new Error(`Published gallery, but failed to verify storage: ${storageError.message || 'Unknown error'}`)
  }

  const { data: rows, error: rowsError } = await args.supabase
    .from('venue_media')
    .select('public_url, sort_order, is_primary')
    .eq('venue_id', args.plan.venueId)
    .order('sort_order', { ascending: true })

  if (rowsError) {
    throw new Error(`Published gallery, but failed to verify venue_media: ${rowsError.message || 'Unknown error'}`)
  }

  const storageObjectNames = (storageObjects || [])
    .filter((item) => Boolean(item.name) && item.id !== null)
    .map((item) => item.name)
  const missingObjectNames = args.plan.entries
    .map((entry) => entry.filename)
    .filter((filename) => !storageObjectNames.includes(filename))

  if (missingObjectNames.length > 0) {
    throw new Error(`Published gallery, but storage verification is missing files: ${missingObjectNames.join(', ')}`)
  }

  const verifiedRows = rows || []
  if (verifiedRows.length !== args.plan.entries.length) {
    throw new Error(`Published gallery, but venue_media verification found ${verifiedRows.length} rows instead of ${args.plan.entries.length}`)
  }

  const expectedUrls = args.plan.entries.map((entry) => entry.publicUrl)
  const actualUrls = verifiedRows.map((row) => row.public_url)
  if (JSON.stringify(actualUrls) !== JSON.stringify(expectedUrls)) {
    throw new Error('Published gallery, but venue_media URL verification failed')
  }

  const primaryRows = verifiedRows.filter((row) => row.is_primary)
  if (primaryRows.length !== 1 || verifiedRows[0]?.is_primary !== true) {
    throw new Error('Published gallery, but venue_media verification found an invalid primary image state')
  }

  const expectedSortOrder = args.plan.entries.map((_, index) => index)
  const actualSortOrder = verifiedRows.map((row) => row.sort_order)
  if (JSON.stringify(actualSortOrder) !== JSON.stringify(expectedSortOrder)) {
    throw new Error(`Published gallery, but venue_media sort_order verification failed: ${actualSortOrder.join(', ')}`)
  }

  let browserOpened = false
  if (args.openBrowser) {
    try {
      await (args.openUrl || defaultOpenUrl)(args.plan.reviewUrl)
      browserOpened = true
    } catch {
      browserOpened = false
    }
  }

  return {
    mode: 'applied',
    plan: args.plan,
    verification: {
      storageObjects: storageObjectNames,
      rows: verifiedRows,
    },
    browserOpened,
  }
}
