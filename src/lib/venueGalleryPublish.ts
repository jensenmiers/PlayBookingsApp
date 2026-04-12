import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import type { SupabaseClient } from '@supabase/supabase-js'
import { replaceVenueImages } from '@/lib/venueMediaWrite'

export const GALLERY_MANIFEST_FILENAME = 'venue-gallery.json'
export const VENUE_MEDIA_BUCKET = 'venue-photos'
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const DEFAULT_APP_URL = 'https://www.playbookings.com'

export const GALLERY_SLOT_ORDER = [
  'hero',
  'gallery_02',
  'gallery_03',
  'gallery_04',
  'gallery_05',
] as const

export type GallerySlot = (typeof GALLERY_SLOT_ORDER)[number]

export type VenueGalleryManifest = Record<GallerySlot, string>

export type PublishVenueGalleryArgs = {
  venueName: string
  sourceDir: string
  apply: boolean
  openBrowser: boolean
}

export type PublishVenueGalleryVenue = {
  id: string
  name: string
  slug: string
}

export type VenueGalleryPlanEntry = {
  slot: GallerySlot
  sourceFilename: string
  sourcePath: string
  canonicalFilename: string
  objectPath: string
  publicUrl: string
  sizeBytes: number
  widthPx: number | null
  heightPx: number | null
  warnings: string[]
}

export type VenueGalleryPlan = {
  venueId: string
  venueName: string
  venueSlug: string
  routeSlug: string
  sourceDir: string
  reviewUrl: string
  entries: VenueGalleryPlanEntry[]
}

type QueryBuilderLike = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{
        data: Array<{ public_url: string; sort_order: number; is_primary: boolean }> | null
        error: { message?: string } | null
      }>
    }
  }
}

type StorageBucketLike = {
  upload: (
    path: string,
    body: Buffer,
    options: { contentType: string; upsert: boolean }
  ) => Promise<{ error: { message?: string } | null }>
  list: (
    path: string,
    options?: { limit?: number; sortBy?: { column: string; order: 'asc' | 'desc' } }
  ) => Promise<{ data: Array<{ name: string }> | null; error: { message?: string } | null }>
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
  let sourceDir = ''
  let apply = false
  let openBrowser = false

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--venue') {
      venueName = argv[index + 1] || ''
      index++
      continue
    }

    if (arg === '--source') {
      sourceDir = argv[index + 1] || ''
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

  if (!sourceDir) {
    throw new Error('Missing required --source argument')
  }

  if (openBrowser && !apply) {
    throw new Error('--open-browser requires --apply')
  }

  return {
    venueName,
    sourceDir,
    apply,
    openBrowser,
  }
}

export function parseVenueGalleryManifest(raw: string): VenueGalleryManifest {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`Invalid manifest JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Manifest must be a JSON object')
  }

  const object = parsed as Record<string, unknown>
  const missingKeys = GALLERY_SLOT_ORDER.filter((key) => typeof object[key] !== 'string' || !String(object[key]).trim())
  if (missingKeys.length > 0) {
    throw new Error(`Missing required manifest keys: ${missingKeys.join(', ')}`)
  }

  return {
    hero: String(object.hero),
    gallery_02: String(object.gallery_02),
    gallery_03: String(object.gallery_03),
    gallery_04: String(object.gallery_04),
    gallery_05: String(object.gallery_05),
  }
}

function getCanonicalFilename(slot: GallerySlot): string {
  switch (slot) {
    case 'hero':
      return 'hero.jpg'
    case 'gallery_02':
      return 'gallery-02.jpg'
    case 'gallery_03':
      return 'gallery-03.jpg'
    case 'gallery_04':
      return 'gallery-04.jpg'
    case 'gallery_05':
      return 'gallery-05.jpg'
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function isJpegFilename(filename: string): boolean {
  return /\.(jpe?g)$/i.test(filename)
}

function extractJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null
  }

  let offset = 2
  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++
      continue
    }

    const marker = buffer[offset + 1]
    offset += 2

    if (marker === 0xd8 || marker === 0xd9) {
      continue
    }

    if (marker === 0xda) {
      break
    }

    if (offset + 1 >= buffer.length) {
      break
    }

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break
    }

    const isStartOfFrame = [
      0xc0, 0xc1, 0xc2, 0xc3,
      0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb,
      0xcd, 0xce, 0xcf,
    ].includes(marker)

    if (isStartOfFrame && offset + 7 < buffer.length) {
      const height = buffer.readUInt16BE(offset + 3)
      const width = buffer.readUInt16BE(offset + 5)
      return { width, height }
    }

    offset += segmentLength
  }

  return null
}

async function readManifestFile(sourceDir: string): Promise<VenueGalleryManifest> {
  const manifestPath = path.join(sourceDir, GALLERY_MANIFEST_FILENAME)

  let raw: string
  try {
    raw = await fs.readFile(manifestPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Missing manifest: ${manifestPath}`)
    }
    throw error
  }

  return parseVenueGalleryManifest(raw)
}

async function inspectGalleryFile(args: {
  sourceDir: string
  filename: string
  slot: GallerySlot
  venueSlug: string
  supabaseUrl: string
}): Promise<VenueGalleryPlanEntry> {
  const sourcePath = path.resolve(args.sourceDir, args.filename)

  let stat
  try {
    stat = await fs.stat(sourcePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Referenced file does not exist: ${args.filename}`)
    }
    throw error
  }

  if (!stat.isFile()) {
    throw new Error(`Referenced path is not a file: ${args.filename}`)
  }

  if (!isJpegFilename(args.filename)) {
    throw new Error(`Referenced file must be a JPEG: ${args.filename}`)
  }

  if (stat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Referenced file exceeds 5 MB limit: ${args.filename}`)
  }

  const content = await fs.readFile(sourcePath)
  const dimensions = extractJpegDimensions(content)
  const warnings: string[] = []

  if (!dimensions) {
    warnings.push('Could not read JPEG dimensions; review this file manually.')
  } else if (dimensions.width < dimensions.height) {
    warnings.push('Image is portrait-oriented; SOP prefers landscape images.')
  } else if (dimensions.width === dimensions.height) {
    warnings.push('Image is square; SOP prefers landscape images.')
  }

  const canonicalFilename = getCanonicalFilename(args.slot)
  const objectPath = `${args.venueSlug}/${canonicalFilename}`
  const publicUrl = `${normalizeBaseUrl(args.supabaseUrl)}/storage/v1/object/public/${VENUE_MEDIA_BUCKET}/${objectPath}`

  return {
    slot: args.slot,
    sourceFilename: args.filename,
    sourcePath,
    canonicalFilename,
    objectPath,
    publicUrl,
    sizeBytes: stat.size,
    widthPx: dimensions?.width ?? null,
    heightPx: dimensions?.height ?? null,
    warnings,
  }
}

export async function buildVenueGalleryPlan(args: {
  venue: PublishVenueGalleryVenue
  sourceDir: string
  supabaseUrl: string
  appUrl?: string
}): Promise<VenueGalleryPlan> {
  const sourceDir = path.resolve(args.sourceDir)
  const manifest = await readManifestFile(sourceDir)
  const filenames = GALLERY_SLOT_ORDER.map((slot) => manifest[slot])

  const duplicateNames = filenames.filter((filename, index) => filenames.indexOf(filename) !== index)
  if (duplicateNames.length > 0) {
    throw new Error(`Duplicate manifest file references: ${Array.from(new Set(duplicateNames)).join(', ')}`)
  }

  const entries = await Promise.all(
    GALLERY_SLOT_ORDER.map((slot) =>
      inspectGalleryFile({
        sourceDir,
        filename: manifest[slot],
        slot,
        venueSlug: args.venue.slug,
        supabaseUrl: args.supabaseUrl,
      })
    )
  )

  const routeSlug = slugifyVenueName(args.venue.name)
  const appUrl = normalizeBaseUrl(args.appUrl || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL)

  return {
    venueId: args.venue.id,
    venueName: args.venue.name,
    venueSlug: args.venue.slug,
    routeSlug,
    sourceDir,
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
      uploadedPaths: string[]
      verification: {
        storageObjects: string[]
        rows: Array<{ public_url: string; sort_order: number; is_primary: boolean }>
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

  const bucket = args.supabase.storage.from(VENUE_MEDIA_BUCKET)
  const uploadedPaths: string[] = []

  for (const entry of args.plan.entries) {
    const fileBuffer = await fs.readFile(entry.sourcePath)
    const { error } = await bucket.upload(entry.objectPath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

    if (error) {
      throw new Error(`Failed to upload ${entry.canonicalFilename}: ${error.message || 'Unknown upload error'}`)
    }

    uploadedPaths.push(entry.objectPath)
  }

  try {
    await replaceVenueImages(args.supabase as never, {
      venueId: args.plan.venueId,
      photoUrls: args.plan.entries.map((entry) => entry.publicUrl),
    })
  } catch (error) {
    throw new Error(
      `Uploaded ${uploadedPaths.length} files but failed to write venue media: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

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

  const storageObjectNames = (storageObjects || []).map((item) => item.name)
  const expectedNames = args.plan.entries.map((entry) => entry.canonicalFilename)
  const missingObjectNames = expectedNames.filter((name) => !storageObjectNames.includes(name))
  if (missingObjectNames.length > 0) {
    throw new Error(`Published gallery, but storage verification is missing files: ${missingObjectNames.join(', ')}`)
  }

  const verifiedRows = rows || []
  if (verifiedRows.length !== args.plan.entries.length) {
    throw new Error(`Published gallery, but venue_media verification found ${verifiedRows.length} rows instead of ${args.plan.entries.length}`)
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
    uploadedPaths,
    verification: {
      storageObjects: (storageObjects || []).map((item) => item.name),
      rows: verifiedRows,
    },
    browserOpened,
  }
}
