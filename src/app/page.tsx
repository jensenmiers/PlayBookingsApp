'use client'

import Link from 'next/link'
import { Navigation } from '@/components/layout/navigation'
import { useState, useEffect, useRef } from 'react'

const SAMPLE_COURTS = [
  { 
    id: '1', 
    name: 'Lincoln MS Gym', 
    type: 'School Gymnasium',
    hourlyRate: 65,
    city: 'Pasadena',
    nextAvailable: '6:00 PM',
    image: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600&q=80'
  },
  { 
    id: '2', 
    name: 'Jefferson Rec Center', 
    type: 'Recreation Center',
    hourlyRate: 55,
    city: 'Los Angeles',
    nextAvailable: '6:30 PM',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'
  },
  { 
    id: '3', 
    name: 'Roosevelt Elementary', 
    type: 'School Gymnasium',
    hourlyRate: 50,
    city: 'Glendale',
    nextAvailable: '7:00 PM',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80'
  },
]

function CourtCard({ 
  court, 
  index, 
  mounted 
}: { 
  court: typeof SAMPLE_COURTS[0]
  index: number
  mounted: boolean 
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href="/search"
      className={`group relative block transform transition-all duration-700 ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
      }`}
      style={{ transitionDelay: `${400 + index * 150}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative overflow-hidden rounded-2xl bg-secondary-800 border border-secondary-50/10 transition-all duration-500 ${
        isHovered ? 'border-primary-400/40 shadow-xl shadow-primary-400/5' : ''
      }`}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <div 
            className={`w-full h-full bg-cover bg-center transition-transform duration-700 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
            style={{ backgroundImage: `url('${court.image}')` }}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-secondary-800/90 to-transparent" />
          
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
              Available {court.nextAvailable}
            </span>
          </div>
        </div>

        <div className="p-4 bg-secondary-800">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h3 className="font-serif text-lg sm:text-xl text-secondary-50 leading-tight truncate">
              {court.name}
            </h3>
            <span className="text-base font-medium text-secondary-50 whitespace-nowrap">
              ${court.hourlyRate}
              <span className="text-sm text-secondary-50/40">/hr</span>
            </span>
          </div>
          
          <p className="text-sm text-secondary-50/50">
            {court.type}
          </p>
        </div>

        <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary-400 to-accent-400 transition-all duration-500 ${
          isHovered ? 'w-full' : 'w-0'
        }`} />
      </div>
    </Link>
  )
}

function CourtCardsScroll({ courts, mounted }: { courts: typeof SAMPLE_COURTS, mounted: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative -mx-6 sm:-mx-10 px-6 sm:px-10">
      <div 
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
      >
        {courts.map((court, i) => (
          <div key={court.id} className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start">
            <CourtCard court={court} index={i} mounted={mounted} />
          </div>
        ))}
        <Link
          href="/venues"
          className={`flex-shrink-0 w-[280px] sm:w-[320px] snap-start transform transition-all duration-700 ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}
          style={{ transitionDelay: `${400 + courts.length * 150}ms` }}
        >
          <div className="h-full rounded-2xl border-2 border-dashed border-secondary-50/20 hover:border-primary-400/40 transition-colors group flex flex-col">
            <div className="aspect-[4/3] flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-secondary-50/5 flex items-center justify-center group-hover:bg-primary-400/10 transition-colors">
                <svg className="w-8 h-8 text-secondary-50/40 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center">
              <span className="text-secondary-50/60 font-medium group-hover:text-primary-400 transition-colors">
                Browse all courts
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <Navigation />

      <section className="relative min-h-screen flex flex-col">
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

        <div className="relative flex-1 flex flex-col justify-end px-6 pb-16 sm:px-10 sm:pb-24 pt-32">
          <div className={`transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <p className="text-accent-400 text-sm sm:text-base font-medium tracking-[0.3em] uppercase mb-4 sm:mb-6">
              Community Courts, Unlocked
            </p>
            
            <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[9rem] leading-[0.9] tracking-tight mb-8 sm:mb-12">
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

        <div className="absolute bottom-0 right-0 w-1/3 h-1 bg-gradient-to-r from-transparent via-accent-400 to-primary-400" />
      </section>

      <section className="relative px-6 py-20 sm:px-10 sm:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-12">
            <div>
              <span className="text-accent-400 text-xs tracking-[0.3em] uppercase mb-3 block">
                Featured
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl">
                Available courts
              </h2>
            </div>
            <Link 
              href="/search"
              className="text-sm font-medium text-secondary-50/50 hover:text-primary-400 transition-colors flex items-center gap-2 self-start sm:self-auto"
            >
              View all availability
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <CourtCardsScroll courts={SAMPLE_COURTS} mounted={mounted} />
        </div>
      </section>

      <section className="relative px-6 py-20 sm:px-10 sm:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-14 sm:mb-20 border-b border-secondary-50/10 pb-6">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl italic">
              How it works
            </h2>
            <span className="text-secondary-50/30 text-sm tracking-widest hidden sm:block">01—03</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-4">
            <div className="md:col-span-7">
              <div className="aspect-[4/3] md:aspect-[16/10] bg-gradient-to-br from-primary-400/15 to-transparent rounded-3xl p-6 sm:p-10 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute top-6 right-6 text-primary-400 text-6xl sm:text-8xl font-serif opacity-15">01</div>
                <span className="text-accent-400 text-xs tracking-[0.3em] uppercase mb-3">Discover</span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-medium mb-2 leading-tight">
                  Find open courts in your community
                </h3>
                <p className="text-secondary-50/50 text-sm sm:text-base max-w-md">
                  Browse available basketball courts at schools and recreation centers near you.
                </p>
              </div>
            </div>

            <div className="md:col-span-5 md:mt-20">
              <div className="aspect-[4/3] bg-gradient-to-br from-accent-400/15 to-transparent rounded-3xl p-6 sm:p-8 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute top-5 right-5 text-accent-400 text-5xl sm:text-7xl font-serif opacity-15">02</div>
                <span className="text-primary-400 text-xs tracking-[0.3em] uppercase mb-3">Book</span>
                <h3 className="text-lg sm:text-xl md:text-2xl font-medium mb-2 leading-tight">
                  Reserve instantly or request
                </h3>
                <p className="text-secondary-50/50 text-sm max-w-sm">
                  Instant booking for approved facilities, or send a quick request.
                </p>
              </div>
            </div>

            <div className="md:col-start-3 md:col-span-6 md:-mt-8">
              <div className="aspect-[16/9] bg-gradient-to-br from-secondary-50/8 to-transparent rounded-3xl p-6 sm:p-8 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute top-5 right-5 text-secondary-50 text-5xl sm:text-7xl font-serif opacity-10">03</div>
                <span className="text-secondary-50/50 text-xs tracking-[0.3em] uppercase mb-3">Play</span>
                <h3 className="text-lg sm:text-xl md:text-2xl font-medium mb-2 leading-tight">
                  Show up and play
                </h3>
                <p className="text-secondary-50/50 text-sm max-w-sm">
                  No phone calls, no back-and-forth. Just you and the court.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 sm:px-10 sm:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-accent-400 text-sm tracking-[0.3em] uppercase mb-4 block">
            Ready to play?
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl leading-tight mb-8 sm:mb-10">
            Your community&apos;s courts<br />
            <span className="italic text-primary-400">are waiting</span>
          </h2>
          <Link 
            href="/search"
            className="inline-flex items-center gap-4 px-10 py-5 bg-primary-400 text-secondary-900 text-lg font-semibold rounded-full hover:bg-primary-500 transition-colors"
          >
            Browse Courts
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      <footer className="border-t border-secondary-50/10 px-6 py-8 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary-50/40">
          <span>Play Bookings © 2026</span>
          <div className="flex gap-6">
            <Link href="/become-a-host" className="hover:text-secondary-50 transition-colors">List your court</Link>
            <Link href="/venues" className="hover:text-secondary-50 transition-colors">All courts</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
