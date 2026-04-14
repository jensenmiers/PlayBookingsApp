import {
  buildVenueGalleryPlan,
  parsePublishVenueGalleryArgs,
  runVenueGalleryPublish,
} from '@/lib/venueGalleryPublish'
import { replaceVenueImages } from '@/lib/venueMediaWrite'

jest.mock('@/lib/venueMediaWrite', () => ({
  replaceVenueImages: jest.fn(),
}))

const mockedReplaceVenueImages = replaceVenueImages as jest.MockedFunction<typeof replaceVenueImages>

function createStorageObject(name: string, id: string | null = 'object-id') {
  return { name, id }
}

describe('venueGalleryPublish helpers', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('parses valid cli args without a source directory', () => {
    expect(
      parsePublishVenueGalleryArgs([
        '--venue',
        'First Presbyterian Church of Hollywood',
        '--apply',
        '--open-browser',
      ])
    ).toEqual({
      venueName: 'First Presbyterian Church of Hollywood',
      apply: true,
      openBrowser: true,
    })
  })

  it('rejects --open-browser without --apply', () => {
    expect(() =>
      parsePublishVenueGalleryArgs([
        '--venue',
        'First Presbyterian Church of Hollywood',
        '--open-browser',
      ])
    ).toThrow('--open-browser requires --apply')
  })

  it('builds a plan from storage objects with hero first and the rest alphabetically', async () => {
    const list = jest.fn().mockResolvedValue({
      data: [
        createStorageObject('gallery-03.jpg'),
        createStorageObject('IMG_2737.JPG'),
        createStorageObject('hero.webp'),
        createStorageObject('gallery-02.jpg'),
      ],
      error: null,
    })

    const plan = await buildVenueGalleryPlan({
      venue: {
        id: 'venue-1',
        name: 'First Presbyterian Church of Hollywood',
        slug: 'first-presbyterian-hollywood',
      },
      supabase: {
        storage: {
          from: () => ({ list }),
        },
        from: jest.fn(),
      } as never,
      supabaseUrl: 'https://example.supabase.co',
      appUrl: 'https://www.playbookings.com',
    })

    expect(plan.entries.map((entry) => entry.filename)).toEqual([
      'hero.webp',
      'gallery-02.jpg',
      'gallery-03.jpg',
      'IMG_2737.JPG',
    ])
    expect(plan.entries.map((entry) => entry.objectPath)).toEqual([
      'first-presbyterian-hollywood/hero.webp',
      'first-presbyterian-hollywood/gallery-02.jpg',
      'first-presbyterian-hollywood/gallery-03.jpg',
      'first-presbyterian-hollywood/IMG_2737.JPG',
    ])
    expect(plan.entries[0].isHero).toBe(true)
    expect(plan.reviewUrl).toBe('https://www.playbookings.com/venue/first-presbyterian-church-of-hollywood')
  })

  it('filters out unsupported files and folder rows', async () => {
    const list = jest.fn().mockResolvedValue({
      data: [
        createStorageObject('notes.txt'),
        createStorageObject('subfolder', null),
        createStorageObject('hero.png'),
        createStorageObject('gallery-02.jpeg'),
      ],
      error: null,
    })

    const plan = await buildVenueGalleryPlan({
      venue: {
        id: 'venue-1',
        name: 'First Presbyterian Church of Hollywood',
        slug: 'first-presbyterian-hollywood',
      },
      supabase: {
        storage: {
          from: () => ({ list }),
        },
        from: jest.fn(),
      } as never,
      supabaseUrl: 'https://example.supabase.co',
    })

    expect(plan.entries.map((entry) => entry.filename)).toEqual(['hero.png', 'gallery-02.jpeg'])
  })

  it('fails when no supported images exist in storage', async () => {
    const list = jest.fn().mockResolvedValue({
      data: [
        createStorageObject('notes.txt'),
        createStorageObject('subfolder', null),
      ],
      error: null,
    })

    await expect(
      buildVenueGalleryPlan({
        venue: {
          id: 'venue-1',
          name: 'First Presbyterian Church of Hollywood',
          slug: 'first-presbyterian-hollywood',
        },
        supabase: {
          storage: {
            from: () => ({ list }),
          },
          from: jest.fn(),
        } as never,
        supabaseUrl: 'https://example.supabase.co',
      })
    ).rejects.toThrow('No supported images found')
  })

  it('does not perform writes in preview mode', async () => {
    const plan = {
      venueId: 'venue-1',
      venueName: 'First Presbyterian Church of Hollywood',
      venueSlug: 'first-presbyterian-hollywood',
      routeSlug: 'first-presbyterian-church-of-hollywood',
      reviewUrl: 'https://www.playbookings.com/venue/first-presbyterian-church-of-hollywood',
      entries: [
        {
          filename: 'hero.jpg',
          objectPath: 'first-presbyterian-hollywood/hero.jpg',
          publicUrl: 'https://example.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/hero.jpg',
          isHero: true,
        },
      ],
    }

    const from = jest.fn()

    const result = await runVenueGalleryPublish({
      apply: false,
      openBrowser: false,
      plan,
      supabase: {
        storage: {
          from: () => ({ list: jest.fn() }),
        },
        from,
      } as never,
    })

    expect(result.mode).toBe('preview')
    expect(mockedReplaceVenueImages).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('replaces venue media rows from storage-derived urls on apply', async () => {
    const plan = {
      venueId: 'venue-1',
      venueName: 'First Presbyterian Church of Hollywood',
      venueSlug: 'first-presbyterian-hollywood',
      routeSlug: 'first-presbyterian-church-of-hollywood',
      reviewUrl: 'https://www.playbookings.com/venue/first-presbyterian-church-of-hollywood',
      entries: [
        {
          filename: 'hero.webp',
          objectPath: 'first-presbyterian-hollywood/hero.webp',
          publicUrl: 'https://example.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/hero.webp',
          isHero: true,
        },
        {
          filename: 'gallery-02.jpg',
          objectPath: 'first-presbyterian-hollywood/gallery-02.jpg',
          publicUrl: 'https://example.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/gallery-02.jpg',
          isHero: false,
        },
      ],
    }

    const list = jest.fn().mockResolvedValue({
      data: [
        createStorageObject('hero.webp'),
        createStorageObject('gallery-02.jpg'),
      ],
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
          from: () => ({ list }),
        },
        from,
      } as never,
      openUrl,
    })

    expect(mockedReplaceVenueImages).toHaveBeenCalledWith(expect.anything(), {
      venueId: 'venue-1',
      photoUrls: plan.entries.map((entry) => entry.publicUrl),
    })
    expect(result.mode).toBe('applied')
    expect(result.verification.rows).toHaveLength(2)
    expect(openUrl).toHaveBeenCalledWith(plan.reviewUrl)
  })

  it('fails verification when stored row urls do not match the derived plan', async () => {
    const plan = {
      venueId: 'venue-1',
      venueName: 'First Presbyterian Church of Hollywood',
      venueSlug: 'first-presbyterian-hollywood',
      routeSlug: 'first-presbyterian-church-of-hollywood',
      reviewUrl: 'https://www.playbookings.com/venue/first-presbyterian-church-of-hollywood',
      entries: [
        {
          filename: 'hero.jpg',
          objectPath: 'first-presbyterian-hollywood/hero.jpg',
          publicUrl: 'https://example.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/hero.jpg',
          isHero: true,
        },
      ],
    }

    mockedReplaceVenueImages.mockResolvedValue(undefined)

    await expect(
      runVenueGalleryPublish({
        apply: true,
        openBrowser: false,
        plan,
        supabase: {
          storage: {
            from: () => ({
              list: jest.fn().mockResolvedValue({
                data: [createStorageObject('hero.jpg')],
                error: null,
              }),
            }),
          },
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      public_url: 'https://example.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/other.jpg',
                      sort_order: 0,
                      is_primary: true,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        } as never,
      })
    ).rejects.toThrow('venue_media URL verification failed')
  })

  it('fails verification when sort order is wrong', async () => {
    const plan = {
      venueId: 'venue-1',
      venueName: 'First Presbyterian Church of Hollywood',
      venueSlug: 'first-presbyterian-hollywood',
      routeSlug: 'first-presbyterian-church-of-hollywood',
      reviewUrl: 'https://www.playbookings.com/venue/first-presbyterian-church-of-hollywood',
      entries: [
        {
          filename: 'hero.jpg',
          objectPath: 'first-presbyterian-hollywood/hero.jpg',
          publicUrl: 'https://example.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/hero.jpg',
          isHero: true,
        },
        {
          filename: 'gallery-02.jpg',
          objectPath: 'first-presbyterian-hollywood/gallery-02.jpg',
          publicUrl: 'https://example.supabase.co/storage/v1/object/public/venue-photos/first-presbyterian-hollywood/gallery-02.jpg',
          isHero: false,
        },
      ],
    }

    mockedReplaceVenueImages.mockResolvedValue(undefined)

    await expect(
      runVenueGalleryPublish({
        apply: true,
        openBrowser: false,
        plan,
        supabase: {
          storage: {
            from: () => ({
              list: jest.fn().mockResolvedValue({
                data: [
                  createStorageObject('hero.jpg'),
                  createStorageObject('gallery-02.jpg'),
                ],
                error: null,
              }),
            }),
          },
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      public_url: plan.entries[0].publicUrl,
                      sort_order: 1,
                      is_primary: true,
                    },
                    {
                      public_url: plan.entries[1].publicUrl,
                      sort_order: 0,
                      is_primary: false,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        } as never,
      })
    ).rejects.toThrow('venue_media sort_order verification failed')
  })
})
