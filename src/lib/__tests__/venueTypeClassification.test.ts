import { matchesCategory } from '@/lib/landingVenues'
import { isGymVenueType } from '@/lib/venueSeo'

describe('venue type classification', () => {
  const venueTypes: Array<string | null | undefined> = [
    'Gym',
    'GYMNASIUM',
    'fieldhouse',
    'Dance Studio',
    'Indoor Basketball Court',
    'Community Center',
    null,
    undefined,
  ]

  it('uses a single gym detection rule across SEO and landing helpers', () => {
    for (const venueType of venueTypes) {
      const isGym = isGymVenueType(venueType)
      expect(matchesCategory(venueType, 'gym-rentals')).toBe(isGym)
      expect(matchesCategory(venueType, 'basketball-courts')).toBe(!isGym)
    }
  })
})
