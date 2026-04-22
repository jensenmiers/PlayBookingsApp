import { resolveLaNeighborhood } from '@/lib/laNeighborhoods'

describe('resolveLaNeighborhood', () => {
  it('matches West Hollywood by address instead of generic Hollywood', () => {
    const result = resolveLaNeighborhood({
      address: '8750 Melrose Ave, West Hollywood, CA 90069',
      latitude: 34.11,
      longitude: -118.33,
    })

    expect(result.slug).toBe('west-hollywood')
  })

  it('matches North Hollywood by address alias', () => {
    const result = resolveLaNeighborhood({
      address: '5142 Lankershim Blvd, North Hollywood, CA 91601',
    })

    expect(result.slug).toBe('north-hollywood')
  })

  it('does not treat street names containing hollywood as Hollywood neighborhood', () => {
    const result = resolveLaNeighborhood({
      address: '2627 N Hollywood Way, Burbank, CA 91505',
    })

    expect(result.slug).toBe('burbank')
  })
})
