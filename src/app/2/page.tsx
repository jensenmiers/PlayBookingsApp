'use client'

import Link from 'next/link'
import { Navigation } from '@/components/layout/navigation'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'
import { useState, useEffect, useMemo } from 'react'
import { useVenues } from '@/hooks/useVenues'
import { useVenuesWithNextAvailable } from '@/hooks/useVenuesWithNextAvailable'
import { buildFeaturedCourts, type FeaturedCourt } from '../home-featured-courts'

const FEATURED_COURT_LIMIT = 3

function SidebarCourtCard({
  court,
  index,
  mounted,
}: {
  court: FeaturedCourt
  index: number
  mounted: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href={court.href}
      className={`group relative block transform transition-all duration-700 ${
        mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
      style={{ transitionDelay: `${600 + index * 200}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative flex overflow-hidden rounded-xl bg-secondary-800/80 border border-secondary-50/10 transition-all duration-500 ${
          isHovered ? 'border-primary-400/40 shadow-lg shadow-primary-400/5' : ''
        }`}
      >
        {/* Bigger card images */}
        <div className="relative w-36 xl:w-40 flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0">
            {court.image ? (
              <div
                className={`w-full h-full bg-cover bg-center transition-transform duration-700 ${
                  isHovered ? 'scale-110' : 'scale-100'
                }`}
                style={{ backgroundImage: `url('${court.image}')` }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-secondary-700 to-secondary-900 flex items-center justify-center">
                <span className="text-secondary-50/40 text-[10px] uppercase tracking-wide">No photo</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
          <h3 className="font-serif text-lg text-secondary-50 leading-tight truncate">
            {court.name}
          </h3>
          <p className="text-xs text-secondary-50/50 mt-0.5 truncate">
            {court.type}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
                {court.nextAvailable}
              </span>
            </div>
            <span className="text-base font-medium text-secondary-50">
              ${court.hourlyRate}
              <span className="text-xs text-secondary-50/40">/hr</span>
            </span>
          </div>
        </div>

        <div
          className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-400 to-accent-400 transition-all duration-500 ${
            isHovered ? 'w-full' : 'w-0'
          }`}
        />
      </div>
    </Link>
  )
}

export default function HomeVariant2() {
  const [mounted, setMounted] = useState(false)
  const { data: venues, loading: venuesLoading } = useVenues()
  const { data: availabilityVenues, loading: availabilityLoading } = useVenuesWithNextAvailable()
  const featuredCourts = useMemo(
    () => buildFeaturedCourts(venues || [], availabilityVenues || [], FEATURED_COURT_LIMIT),
    [venues, availabilityVenues]
  )
  const featuredLoading = venuesLoading || availabilityLoading

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <Navigation />

      <section className="relative flex flex-col h-[calc(100dvh-4rem)] min-h-[calc(100dvh-4rem)] lg:flex-row">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&q=80')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-secondary-900/80 via-secondary-900/40 to-secondary-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-secondary-900/90 via-transparent to-transparent" />
        </div>

        {/* OPTION 2 CHANGE: lg:w-[60%] → lg:w-[55%] */}
        <div className="relative flex-1 flex min-h-0 flex-col justify-end px-6 pb-16 sm:px-10 sm:pb-24 pt-32 lg:w-[55%] lg:flex-none lg:pb-20">
          <div className={`transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <p className="text-accent-400 text-sm sm:text-base font-medium tracking-[0.3em] uppercase mb-4 sm:mb-6">
              Community Courts, Unlocked
            </p>

            {/* OPTION 2 CHANGE: tighter headline lg:text-[5.5rem] xl:text-[6rem] */}
            <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[5.5rem] xl:text-[6rem] leading-[0.9] tracking-tight mb-8 sm:mb-12">
              <span className="block">Find a court.</span>
              <span className="block text-primary-400">Book it.</span>
              <span className="block italic font-light">Go play.</span>
            </h1>
          </div>

          <div className={`max-w-xl transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <Link
              href="/search"
              className="group flex items-center justify-between w-full px-6 sm:px-8 py-5 sm:py-6 bg-secondary-50 text-secondary-900 rounded-2xl hover:bg-primary-400 transition-colors"
            >
              <span className="text-lg sm:text-xl font-medium">
                See available courts now
              </span>
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            <p className="mt-4 text-secondary-50/60 text-sm sm:text-base">
              No phone calls. No waiting. Just play.
            </p>
          </div>
        </div>

        {/* OPTION 2 CHANGE: lg:w-[40%] → lg:w-[45%], bigger padding and gap */}
        <div className="relative hidden lg:flex lg:w-[45%] lg:flex-col lg:justify-center lg:px-8 lg:py-8 xl:px-12">
          <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" />

          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-accent-400 text-xs tracking-[0.3em] uppercase">
                Available Now
              </span>
              <Link
                href="/search"
                className="text-xs text-secondary-50/40 hover:text-primary-400 transition-colors flex items-center gap-1"
              >
                View all
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {featuredLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-secondary-800/50 border border-secondary-50/10 animate-pulse"
                  />
                ))}
              </>
            ) : featuredCourts.length > 0 ? (
              featuredCourts.map((court, i) => (
                <SidebarCourtCard key={court.id} court={court} index={i} mounted={mounted} />
              ))
            ) : (
              <div className="rounded-xl border border-secondary-50/10 bg-secondary-800/30 p-4 text-secondary-50/50 text-sm">
                No upcoming availability yet.
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent-400 to-primary-400" />
      </section>

      <PublicSiteFooter />
    </div>
  )
}
