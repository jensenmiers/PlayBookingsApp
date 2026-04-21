export type LaNeighborhood = {
  slug: string
  name: string
  aliases: string[]
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
}

export const LA_NEIGHBORHOODS: LaNeighborhood[] = [
  { slug: 'hollywood', name: 'Hollywood', aliases: ['hollywood', 'west hollywood', 'east hollywood'], bounds: { minLat: 34.085, maxLat: 34.125, minLng: -118.360, maxLng: -118.305 } },
  { slug: 'los-feliz', name: 'Los Feliz', aliases: ['los feliz'], bounds: { minLat: 34.095, maxLat: 34.135, minLng: -118.305, maxLng: -118.275 } },
  { slug: 'silver-lake', name: 'Silver Lake', aliases: ['silver lake', 'silverlake'], bounds: { minLat: 34.080, maxLat: 34.110, minLng: -118.285, maxLng: -118.255 } },
  { slug: 'echo-park', name: 'Echo Park', aliases: ['echo park'], bounds: { minLat: 34.065, maxLat: 34.090, minLng: -118.270, maxLng: -118.240 } },
  { slug: 'koreatown', name: 'Koreatown', aliases: ['koreatown', 'k-town'], bounds: { minLat: 34.055, maxLat: 34.075, minLng: -118.315, maxLng: -118.285 } },
  { slug: 'downtown-la', name: 'Downtown LA', aliases: ['downtown', 'dtla', 'downtown los angeles'], bounds: { minLat: 34.030, maxLat: 34.065, minLng: -118.275, maxLng: -118.230 } },
  { slug: 'mid-city', name: 'Mid City', aliases: ['mid city', 'mid-city'], bounds: { minLat: 34.035, maxLat: 34.065, minLng: -118.365, maxLng: -118.315 } },
  { slug: 'mid-wilshire', name: 'Mid-Wilshire', aliases: ['mid-wilshire', 'mid wilshire', 'miracle mile'], bounds: { minLat: 34.055, maxLat: 34.075, minLng: -118.365, maxLng: -118.315 } },
  { slug: 'west-hollywood', name: 'West Hollywood', aliases: ['west hollywood', 'weho'], bounds: { minLat: 34.078, maxLat: 34.098, minLng: -118.395, maxLng: -118.355 } },
  { slug: 'beverly-hills', name: 'Beverly Hills', aliases: ['beverly hills'], bounds: { minLat: 34.060, maxLat: 34.105, minLng: -118.425, maxLng: -118.380 } },
  { slug: 'century-city', name: 'Century City', aliases: ['century city'], bounds: { minLat: 34.050, maxLat: 34.070, minLng: -118.425, maxLng: -118.405 } },
  { slug: 'westwood', name: 'Westwood', aliases: ['westwood', 'ucla'], bounds: { minLat: 34.055, maxLat: 34.085, minLng: -118.460, maxLng: -118.425 } },
  { slug: 'santa-monica', name: 'Santa Monica', aliases: ['santa monica'], bounds: { minLat: 34.000, maxLat: 34.055, minLng: -118.520, maxLng: -118.465 } },
  { slug: 'venice', name: 'Venice', aliases: ['venice'], bounds: { minLat: 33.980, maxLat: 34.010, minLng: -118.490, maxLng: -118.445 } },
  { slug: 'culver-city', name: 'Culver City', aliases: ['culver city'], bounds: { minLat: 33.985, maxLat: 34.035, minLng: -118.425, maxLng: -118.370 } },
  { slug: 'mar-vista', name: 'Mar Vista', aliases: ['mar vista'], bounds: { minLat: 33.985, maxLat: 34.015, minLng: -118.450, maxLng: -118.420 } },
  { slug: 'playa-vista', name: 'Playa Vista', aliases: ['playa vista'], bounds: { minLat: 33.965, maxLat: 33.985, minLng: -118.435, maxLng: -118.400 } },
  { slug: 'west-la', name: 'West LA', aliases: ['west la', 'west los angeles', 'sawtelle'], bounds: { minLat: 34.025, maxLat: 34.060, minLng: -118.465, maxLng: -118.425 } },
  { slug: 'hollywood-hills', name: 'Hollywood Hills', aliases: ['hollywood hills'], bounds: { minLat: 34.115, maxLat: 34.145, minLng: -118.400, maxLng: -118.320 } },
  { slug: 'studio-city', name: 'Studio City', aliases: ['studio city'], bounds: { minLat: 34.130, maxLat: 34.165, minLng: -118.415, maxLng: -118.370 } },
  { slug: 'north-hollywood', name: 'North Hollywood', aliases: ['north hollywood', 'noho'], bounds: { minLat: 34.160, maxLat: 34.205, minLng: -118.410, maxLng: -118.360 } },
  { slug: 'sherman-oaks', name: 'Sherman Oaks', aliases: ['sherman oaks'], bounds: { minLat: 34.130, maxLat: 34.175, minLng: -118.475, maxLng: -118.420 } },
  { slug: 'van-nuys', name: 'Van Nuys', aliases: ['van nuys'], bounds: { minLat: 34.170, maxLat: 34.220, minLng: -118.480, maxLng: -118.425 } },
  { slug: 'burbank', name: 'Burbank', aliases: ['burbank'], bounds: { minLat: 34.155, maxLat: 34.215, minLng: -118.360, maxLng: -118.295 } },
  { slug: 'glendale', name: 'Glendale', aliases: ['glendale'], bounds: { minLat: 34.125, maxLat: 34.210, minLng: -118.305, maxLng: -118.220 } },
  { slug: 'pasadena', name: 'Pasadena', aliases: ['pasadena'], bounds: { minLat: 34.120, maxLat: 34.185, minLng: -118.185, maxLng: -118.100 } },
  { slug: 'highland-park', name: 'Highland Park', aliases: ['highland park'], bounds: { minLat: 34.100, maxLat: 34.135, minLng: -118.210, maxLng: -118.175 } },
  { slug: 'eagle-rock', name: 'Eagle Rock', aliases: ['eagle rock'], bounds: { minLat: 34.135, maxLat: 34.170, minLng: -118.230, maxLng: -118.190 } },
  { slug: 'boyle-heights', name: 'Boyle Heights', aliases: ['boyle heights'], bounds: { minLat: 34.020, maxLat: 34.055, minLng: -118.220, maxLng: -118.180 } },
  { slug: 'south-la', name: 'South LA', aliases: ['south la', 'south los angeles', 'south central'], bounds: { minLat: 33.965, maxLat: 34.025, minLng: -118.325, maxLng: -118.240 } },
  { slug: 'inglewood', name: 'Inglewood', aliases: ['inglewood'], bounds: { minLat: 33.935, maxLat: 33.985, minLng: -118.380, maxLng: -118.315 } },
  { slug: 'long-beach', name: 'Long Beach', aliases: ['long beach'], bounds: { minLat: 33.740, maxLat: 33.850, minLng: -118.235, maxLng: -118.090 } },
]

export const DEFAULT_LA_NEIGHBORHOOD: LaNeighborhood = {
  slug: 'los-angeles',
  name: 'Los Angeles',
  aliases: ['los angeles', 'la'],
  bounds: { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 },
}

function matchByAddress(address: string | null | undefined): LaNeighborhood | null {
  if (!address) return null
  const haystack = address.toLowerCase()
  for (const hood of LA_NEIGHBORHOODS) {
    for (const alias of hood.aliases) {
      if (haystack.includes(alias)) return hood
    }
  }
  return null
}

function matchByCoords(latitude: number | null | undefined, longitude: number | null | undefined): LaNeighborhood | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  for (const hood of LA_NEIGHBORHOODS) {
    const { minLat, maxLat, minLng, maxLng } = hood.bounds
    if (latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng) {
      return hood
    }
  }
  return null
}

export function resolveLaNeighborhood(input: {
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}): LaNeighborhood {
  return (
    matchByAddress(input.address) ||
    matchByCoords(input.latitude, input.longitude) ||
    DEFAULT_LA_NEIGHBORHOOD
  )
}

export function findNeighborhoodBySlug(slug: string): LaNeighborhood | null {
  if (slug === DEFAULT_LA_NEIGHBORHOOD.slug) return DEFAULT_LA_NEIGHBORHOOD
  return LA_NEIGHBORHOODS.find((n) => n.slug === slug) ?? null
}
