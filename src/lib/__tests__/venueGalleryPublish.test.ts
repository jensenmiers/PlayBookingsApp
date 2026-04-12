import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  buildVenueGalleryPlan,
  parsePublishVenueGalleryArgs,
  parseVenueGalleryManifest,
  runVenueGalleryPublish,
} from '@/lib/venueGalleryPublish'
import { replaceVenueImages } from '@/lib/venueMediaWrite'

jest.mock('@/lib/venueMediaWrite', () => ({
  replaceVenueImages: jest.fn(),
}))

const mockedReplaceVenueImages = replaceVenueImages as jest.MockedFunction<typeof replaceVenueImages>

function createFakeJpegBuffer(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(2 + 18 + 19 + 2)
  let offset = 0

  buffer[offset++] = 0xff
  buffer[offset++] = 0xd8

  buffer[offset++] = 0xff
  buffer[offset++] = 0xe0
  buffer.writeUInt16BE(16, offset)
  offset += 2
  buffer.write('JFIF\0', offset, 'ascii')
  offset += 5
  buffer[offset++] = 0x01
  buffer[offset++] = 0x01
  buffer[offset++] = 0x00
  buffer.writeUInt16BE(1, offset)
  offset += 2
  buffer.writeUInt16BE(1, offset)
  offset += 2
  buffer[offset++] = 0x00
  buffer[offset++] = 0x00

  buffer[offset++] = 0xff
  buffer[offset++] = 0xc0
  buffer.writeUInt16BE(17, offset)
  offset += 2
  buffer[offset++] = 0x08
  buffer.writeUInt16BE(height, offset)
  offset += 2
  buffer.writeUInt16BE(width, offset)
  offset += 2
  buffer[offset++] = 0x03
  buffer[offset++] = 0x01
  buffer[offset++] = 0x11
  buffer[offset++] = 0x00
  buffer[offset++] = 0x02
  buffer[offset++] = 0x11
  buffer[offset++] = 0x00
  buffer[offset++] = 0x03
  buffer[offset++] = 0x11
  buffer[offset++] = 0x00

  buffer[offset++] = 0xff
  buffer[offset++] = 0xd9

  return buffer
}

function createGalleryFolder(args?: {
  manifest?: Record<string, string>
  files?: Record<string, Buffer | string>
}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'venue-gallery-'))

  if (args?.manifest) {
    fs.writeFileSync(
      path.join(dir, 'venue-gallery.json'),
      JSON.stringify(args.manifest, null, 2),
      'utf8'
    )
  }

  for (const [filename, content] of Object.entries(args?.files || {})) {
    fs.writeFileSync(path.join(dir, filename), content)
  }

  return dir
}

const validManifest = {
  hero: 'hero-source.jpg',
  gallery_02: 'court-a.jpg',
  gallery_03: 'court-b.jpeg',
  gallery_04: 'court-c.jpg',
  gallery_05: 'entrance.jpg',
}

const defaultFiles = {
  'hero-source.jpg': createFakeJpegBuffer(2400, 1600),
  'court-a.jpg': createFakeJpegBuffer(2200, 1400),
  'court-b.jpeg': createFakeJpegBuffer(2100, 1400),
  'court-c.jpg': createFakeJpegBuffer(2300, 1500),
  'entrance.jpg': createFakeJpegBuffer(2000, 1333),
}

describe('venueGalleryPublish helpers', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('parses valid cli args', () => {
    expect(
      parsePublishVenueGalleryArgs([
        '--venue',
        'First Presbyterian Church of Hollywood',
        '--source',
        './tmp/gallery',
        '--apply',
        '--open-browser',
      ])
    ).toEqual({
      venueName: 'First Presbyterian Church of Hollywood',
      sourceDir: './tmp/gallery',
      apply: true,
      openBrowser: true,
    })
  })

  it('rejects --open-browser without --apply', () => {
    expect(() =>
      parsePublishVenueGalleryArgs([
        '--venue',
        'First Presbyterian Church of Hollywood',
        '--source',
        './tmp/gallery',
        '--open-browser',
      ])
    ).toThrow('--open-browser requires --apply')
  })

  it('rejects a manifest with missing required keys', () => {
    expect(() =>
      parseVenueGalleryManifest(JSON.stringify({ hero: 'hero.jpg' }))
    ).toThrow('Missing required manifest keys')
  })

  it('fails when the manifest file is missing', async () => {
    const dir = createGalleryFolder({ files: defaultFiles })

    await expect(
      buildVenueGalleryPlan({
        venue: {
          id: 'venue-1',
          name: 'First Presbyterian Church of Hollywood',
          slug: 'first-presbyterian-hollywood',
        },
        sourceDir: dir,
        supabaseUrl: 'https://example.supabase.co',
      })
    ).rejects.toThrow('Missing manifest')
  })

  it('fails when a referenced file is missing', async () => {
    const dir = createGalleryFolder({
      manifest: validManifest,
      files: {
        'hero-source.jpg': defaultFiles['hero-source.jpg'],
      },
    })

    await expect(
      buildVenueGalleryPlan({
        venue: {
          id: 'venue-1',
          name: 'First Presbyterian Church of Hollywood',
          slug: 'first-presbyterian-hollywood',
        },
        sourceDir: dir,
        supabaseUrl: 'https://example.supabase.co',
      })
    ).rejects.toThrow('Referenced file does not exist')
  })

  it('fails when the manifest references duplicate files', async () => {
    const dir = createGalleryFolder({
      manifest: {
        ...validManifest,
        gallery_02: 'hero-source.jpg',
      },
      files: defaultFiles,
    })

    await expect(
      buildVenueGalleryPlan({
        venue: {
          id: 'venue-1',
          name: 'First Presbyterian Church of Hollywood',
          slug: 'first-presbyterian-hollywood',
        },
        sourceDir: dir,
        supabaseUrl: 'https://example.supabase.co',
      })
    ).rejects.toThrow('Duplicate manifest file references')
  })

  it('fails when a referenced file is not a jpeg', async () => {
    const dir = createGalleryFolder({
      manifest: {
        ...validManifest,
        gallery_05: 'entrance.png',
      },
      files: {
        ...defaultFiles,
        'entrance.png': 'not-a-jpeg',
      },
    })

    await expect(
      buildVenueGalleryPlan({
        venue: {
          id: 'venue-1',
          name: 'First Presbyterian Church of Hollywood',
          slug: 'first-presbyterian-hollywood',
        },
        sourceDir: dir,
        supabaseUrl: 'https://example.supabase.co',
      })
    ).rejects.toThrow('must be a JPEG')
  })

  it('maps local files to canonical storage names and warns on portrait images', async () => {
    const dir = createGalleryFolder({
      manifest: {
        ...validManifest,
        gallery_05: 'portrait-entrance.jpg',
      },
      files: {
        ...defaultFiles,
        'portrait-entrance.jpg': createFakeJpegBuffer(1200, 1800),
      },
    })

    const plan = await buildVenueGalleryPlan({
      venue: {
        id: 'venue-1',
        name: 'First Presbyterian Church of Hollywood',
        slug: 'first-presbyterian-hollywood',
      },
      sourceDir: dir,
      supabaseUrl: 'https://example.supabase.co',
      appUrl: 'https://www.playbookings.com',
    })

    expect(plan.entries.map((entry) => entry.canonicalFilename)).toEqual([
      'hero.jpg',
      'gallery-02.jpg',
      'gallery-03.jpg',
      'gallery-04.jpg',
      'gallery-05.jpg',
    ])
    expect(plan.entries.map((entry) => entry.objectPath)).toEqual([
      'first-presbyterian-hollywood/hero.jpg',
      'first-presbyterian-hollywood/gallery-02.jpg',
      'first-presbyterian-hollywood/gallery-03.jpg',
      'first-presbyterian-hollywood/gallery-04.jpg',
      'first-presbyterian-hollywood/gallery-05.jpg',
    ])
    expect(plan.reviewUrl).toBe('https://www.playbookings.com/venue/first-presbyterian-church-of-hollywood')
    expect(plan.entries[4].warnings).toContain('Image is portrait-oriented; SOP prefers landscape images.')
  })

  it('does not perform writes in preview mode', async () => {
    const dir = createGalleryFolder({
      manifest: validManifest,
      files: defaultFiles,
    })

    const plan = await buildVenueGalleryPlan({
      venue: {
        id: 'venue-1',
        name: 'First Presbyterian Church of Hollywood',
        slug: 'first-presbyterian-hollywood',
      },
      sourceDir: dir,
      supabaseUrl: 'https://example.supabase.co',
    })

    const upload = jest.fn()
    const list = jest.fn()
    const from = jest.fn()

    const result = await runVenueGalleryPublish({
      apply: false,
      openBrowser: false,
      plan,
      supabase: {
        storage: {
          from: () => ({ upload, list }),
        },
        from,
      } as never,
    })

    expect(result.mode).toBe('preview')
    expect(upload).not.toHaveBeenCalled()
    expect(mockedReplaceVenueImages).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('uploads files and replaces venue media rows on apply', async () => {
    const dir = createGalleryFolder({
      manifest: validManifest,
      files: defaultFiles,
    })

    const plan = await buildVenueGalleryPlan({
      venue: {
        id: 'venue-1',
        name: 'First Presbyterian Church of Hollywood',
        slug: 'first-presbyterian-hollywood',
      },
      sourceDir: dir,
      supabaseUrl: 'https://example.supabase.co',
    })

    const upload = jest.fn().mockResolvedValue({ error: null })
    const list = jest.fn().mockResolvedValue({
      data: plan.entries.map((entry) => ({ name: entry.canonicalFilename })),
      error: null,
    })
    const order = jest.fn().mockResolvedValue({
      data: plan.entries.map((entry, index) => ({
        public_url: entry.publicUrl,
        sort_order: index,
        is_primary: index === 0,
      })),
      error: null,
    })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    const from = jest.fn().mockReturnValue({ select })
    const openUrl = jest.fn().mockResolvedValue(undefined)

    mockedReplaceVenueImages.mockResolvedValue(undefined)

    const result = await runVenueGalleryPublish({
      apply: true,
      openBrowser: true,
      plan,
      supabase: {
        storage: {
          from: () => ({ upload, list }),
        },
        from,
      } as never,
      openUrl,
    })

    expect(upload).toHaveBeenCalledTimes(5)
    expect(mockedReplaceVenueImages).toHaveBeenCalledWith(
      expect.anything(),
      {
        venueId: 'venue-1',
        photoUrls: plan.entries.map((entry) => entry.publicUrl),
      }
    )
    expect(result.mode).toBe('applied')
    expect(result.verification.rows).toHaveLength(5)
    expect(openUrl).toHaveBeenCalledWith(plan.reviewUrl)
  })

  it('aborts before db replacement if an upload fails', async () => {
    const dir = createGalleryFolder({
      manifest: validManifest,
      files: defaultFiles,
    })

    const plan = await buildVenueGalleryPlan({
      venue: {
        id: 'venue-1',
        name: 'First Presbyterian Church of Hollywood',
        slug: 'first-presbyterian-hollywood',
      },
      sourceDir: dir,
      supabaseUrl: 'https://example.supabase.co',
    })

    const upload = jest
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'boom' } })

    await expect(
      runVenueGalleryPublish({
        apply: true,
        openBrowser: false,
        plan,
        supabase: {
          storage: {
            from: () => ({ upload, list: jest.fn() }),
          },
          from: jest.fn(),
        } as never,
      })
    ).rejects.toThrow('Failed to upload gallery-02.jpg')

    expect(mockedReplaceVenueImages).not.toHaveBeenCalled()
  })

  it('reports a partial failure when uploads succeed but db replacement fails', async () => {
    const dir = createGalleryFolder({
      manifest: validManifest,
      files: defaultFiles,
    })

    const plan = await buildVenueGalleryPlan({
      venue: {
        id: 'venue-1',
        name: 'First Presbyterian Church of Hollywood',
        slug: 'first-presbyterian-hollywood',
      },
      sourceDir: dir,
      supabaseUrl: 'https://example.supabase.co',
    })

    const upload = jest.fn().mockResolvedValue({ error: null })
    mockedReplaceVenueImages.mockRejectedValue(new Error('db failure'))

    await expect(
      runVenueGalleryPublish({
        apply: true,
        openBrowser: false,
        plan,
        supabase: {
          storage: {
            from: () => ({ upload, list: jest.fn() }),
          },
          from: jest.fn(),
        } as never,
      })
    ).rejects.toThrow('Uploaded 5 files but failed to write venue media')
  })
})
