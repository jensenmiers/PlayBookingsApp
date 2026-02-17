'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

// Design 1: Editorial Magazine
// Bold typography with dramatic scale contrast, full-bleed photography,
// asymmetric grid-breaking layout, warm amber/court floor tones

export default function Design1() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#1a1612] text-[#faf4ef] overflow-hidden">
      {/* Minimal Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="font-semibold text-lg tracking-tight text-[#faf4ef]/90">
          Play Bookings
        </Link>
        <Link 
          href="/venues" 
          className="px-5 py-2.5 text-sm font-medium bg-[#4ade80] text-[#1a1612] rounded-full hover:bg-[#22c55e] transition-colors"
        >
          Find Courts
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&q=80')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1612]/80 via-[#1a1612]/40 to-[#1a1612]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1612]/90 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col justify-end px-6 pb-16 sm:px-10 sm:pb-24 pt-32">
          {/* Editorial Typography */}
          <div className={`transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <p className="text-[#fb923c] text-sm sm:text-base font-medium tracking-[0.3em] uppercase mb-4 sm:mb-6">
              Community Courts, Unlocked
            </p>
            
            <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[9rem] leading-[0.9] tracking-tight mb-8 sm:mb-12">
              <span className="block">Find a court.</span>
              <span className="block text-[#4ade80]">Book it.</span>
              <span className="block italic font-light">Go play.</span>
            </h1>
          </div>

          {/* Search CTA */}
          <div className={`max-w-xl transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <Link 
              href="/search"
              className="group flex items-center justify-between w-full px-6 sm:px-8 py-5 sm:py-6 bg-[#faf4ef] text-[#1a1612] rounded-2xl hover:bg-[#4ade80] transition-colors"
            >
              <span className="text-lg sm:text-xl font-medium">
                See available courts now
              </span>
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            
            <p className="mt-4 text-[#faf4ef]/60 text-sm sm:text-base">
              No phone calls. No waiting. Just play.
            </p>
          </div>
        </div>

        {/* Diagonal Accent Line */}
        <div className="absolute bottom-0 right-0 w-1/3 h-1 bg-gradient-to-r from-transparent via-[#fb923c] to-[#4ade80]" />
      </section>

      {/* How It Works - Editorial Grid */}
      <section className="relative px-6 py-24 sm:px-10 sm:py-32 bg-[#1a1612]">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex items-end justify-between mb-16 sm:mb-24 border-b border-[#faf4ef]/10 pb-8">
            <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl italic">
              How it works
            </h2>
            <span className="text-[#faf4ef]/40 text-sm tracking-widest">01—03</span>
          </div>

          {/* Asymmetric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-4">
            {/* Step 1 - Large */}
            <div className="md:col-span-7 group">
              <div className="aspect-[4/3] md:aspect-[16/10] bg-gradient-to-br from-[#4ade80]/20 to-transparent rounded-3xl p-8 sm:p-12 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute top-8 right-8 text-[#4ade80] text-8xl sm:text-9xl font-serif opacity-20">01</div>
                <span className="text-[#fb923c] text-xs tracking-[0.3em] uppercase mb-3">Discover</span>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-medium mb-3 leading-tight">
                  Find open courts in your community
                </h3>
                <p className="text-[#faf4ef]/60 text-sm sm:text-base max-w-md">
                  Browse available basketball courts at schools and recreation centers near you.
                </p>
              </div>
            </div>

            {/* Step 2 - Medium */}
            <div className="md:col-span-5 md:mt-24 group">
              <div className="aspect-[4/3] bg-gradient-to-br from-[#fb923c]/20 to-transparent rounded-3xl p-8 sm:p-10 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute top-6 right-6 text-[#fb923c] text-7xl sm:text-8xl font-serif opacity-20">02</div>
                <span className="text-[#4ade80] text-xs tracking-[0.3em] uppercase mb-3">Book</span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-medium mb-3 leading-tight">
                  Reserve instantly or request
                </h3>
                <p className="text-[#faf4ef]/60 text-sm max-w-sm">
                  Instant booking for approved facilities, or send a quick request.
                </p>
              </div>
            </div>

            {/* Step 3 - Offset */}
            <div className="md:col-start-3 md:col-span-6 md:-mt-12 group">
              <div className="aspect-[16/9] bg-gradient-to-br from-[#faf4ef]/10 to-transparent rounded-3xl p-8 sm:p-10 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute top-6 right-6 text-[#faf4ef] text-7xl sm:text-8xl font-serif opacity-10">03</div>
                <span className="text-[#faf4ef]/60 text-xs tracking-[0.3em] uppercase mb-3">Play</span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-medium mb-3 leading-tight">
                  Show up and play
                </h3>
                <p className="text-[#faf4ef]/60 text-sm max-w-sm">
                  No phone calls, no back-and-forth. Just you and the court.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-6 py-24 sm:px-10 sm:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#fb923c] text-sm tracking-[0.3em] uppercase mb-6">
            Ready to play?
          </p>
          <h2 className="font-serif text-4xl sm:text-6xl md:text-7xl leading-tight mb-12">
            Your community&apos;s courts<br />
            <span className="italic text-[#4ade80]">are waiting</span>
          </h2>
          <Link 
            href="/venues"
            className="inline-flex items-center gap-4 px-10 py-5 bg-[#4ade80] text-[#1a1612] text-lg font-semibold rounded-full hover:bg-[#22c55e] transition-colors"
          >
            Browse Courts
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#faf4ef]/10 px-6 py-8 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#faf4ef]/40">
          <span>Play Bookings © 2026</span>
          <div className="flex gap-6">
            <Link href="/become-a-host" className="hover:text-[#faf4ef] transition-colors">List your court</Link>
            <Link href="/venues" className="hover:text-[#faf4ef] transition-colors">All courts</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
