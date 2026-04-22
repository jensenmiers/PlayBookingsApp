export type VenueCategory = 'basketball-courts' | 'gym-rentals'

export type CityLandingRoute = {
  citySlug: 'los-angeles'
  category: VenueCategory
  path: string
  h1: string
  title: string
  description: string
  intro: string
}

export type IntentLandingRoute = {
  slug: string
  path: string
  category: VenueCategory
  title: string
  description: string
  h1: string
  intro: string
}

export const CITY_LANDING_ROUTES: CityLandingRoute[] = [
  {
    citySlug: 'los-angeles',
    category: 'basketball-courts',
    path: '/los-angeles/basketball-courts',
    h1: 'Basketball Court Rentals in Los Angeles',
    title: 'Basketball Court Rentals in Los Angeles — Book by the Hour',
    description:
      'Rent an indoor basketball court in Los Angeles. Private runs, team practices, birthday parties. Browse by neighborhood and book online.',
    intro:
      'Private indoor basketball courts across LA — from Hollywood to Santa Monica to Downtown. Pick a neighborhood, see real-time availability, and book your run in minutes.',
  },
  {
    citySlug: 'los-angeles',
    category: 'gym-rentals',
    path: '/los-angeles/gym-rentals',
    h1: 'Private Gym Rentals in Los Angeles',
    title: 'Gym Rentals in Los Angeles — Hourly Bookings for Teams & Groups',
    description:
      'Rent a private gym in Los Angeles by the hour. Ideal for team practices, private training, camps, and events. Browse gyms by LA neighborhood.',
    intro:
      'Private gyms for hire across Los Angeles. Book by the hour for team practices, private training, events, or open runs — browse by neighborhood below.',
  },
]

export const INTENT_LANDING_ROUTES: IntentLandingRoute[] = [
  {
    slug: 'basketball-court-rental-los-angeles',
    path: '/basketball-court-rental-los-angeles',
    category: 'basketball-courts',
    title: 'Basketball Court Rental — Los Angeles | PlayBookings',
    description:
      'Looking to rent a basketball court in Los Angeles? Browse private indoor courts across LA, see hourly rates, and book online.',
    h1: 'Basketball Court Rental in Los Angeles',
    intro:
      "If you're trying to rent a basketball court in LA — for a pickup run, team practice, birthday, or private event — start here. Browse every indoor court available on PlayBookings, grouped by neighborhood.",
  },
  {
    slug: 'indoor-basketball-court-los-angeles',
    path: '/indoor-basketball-court-los-angeles',
    category: 'basketball-courts',
    title: 'Indoor Basketball Courts in Los Angeles — Book Private Runs',
    description:
      'Find indoor basketball courts in Los Angeles available to rent. Real-time availability, hourly rates, and instant bookings across LA neighborhoods.',
    h1: 'Indoor Basketball Courts in Los Angeles',
    intro:
      'Air-conditioned, weather-proof indoor basketball courts across Los Angeles. Pick a neighborhood, see open slots today, and book online — no group chat wrangling required.',
  },
  {
    slug: 'gym-rental-los-angeles',
    path: '/gym-rental-los-angeles',
    category: 'gym-rentals',
    title: 'Gym Rental — Los Angeles | PlayBookings',
    description:
      'Rent a private gym in Los Angeles by the hour for practices, training, camps, and events. Browse LA gyms and book online.',
    h1: 'Gym Rentals in Los Angeles',
    intro:
      'Private gyms across LA available to rent by the hour. Team practices, private training, camps, birthday parties — browse by neighborhood and book online.',
  },
]

export function findCityLanding(
  citySlug: 'los-angeles',
  category: VenueCategory
): CityLandingRoute | null {
  return (
    CITY_LANDING_ROUTES.find(
      (route) => route.citySlug === citySlug && route.category === category
    ) ?? null
  )
}

export function findIntentLanding(slug: string): IntentLandingRoute | null {
  return INTENT_LANDING_ROUTES.find((route) => route.slug === slug) ?? null
}
