'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

// Design 4: Refined Minimal
// Ultra-clean luxury feel, dramatic whitespace, serif typography pairing,
// single large photo with floating elements, premium aesthetic

export default function Design4() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#fcfaf8] text-[#1c1917]">
      {/* Nav - Ultra Minimal */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 sm:px-12 md:px-20">
        <Link href="/" className="font-serif text-lg tracking-wide">
          Play Bookings
        </Link>
        <div className="flex items-center gap-8">
          <Link 
            href="/become-a-host" 
            className="hidden sm:block text-sm text-[#1c1917]/50 hover:text-[#1c1917] transition-colors"
          >
            For hosts
          </Link>
          <Link 
            href="/search" 
            className="text-sm font-medium underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
          >
            Find a court
          </Link>
        </div>
      </nav>

      {/* Hero - Dramatic Split */}
      <section className="min-h-screen flex flex-col lg:flex-row">
        {/* Left: Content */}
        <div className="flex-1 flex flex-col justify-center px-8 py-32 sm:px-12 md:px-20 lg:py-0">
          <div className="max-w-lg">
            {/* Subtle Tag */}
            <div className={`transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <span className="inline-block text-xs tracking-[0.3em] uppercase text-[#1c1917]/40 mb-8">
                Basketball Courts · Made Simple
              </span>
            </div>

            {/* Main Headline - Serif */}
            <h1 className={`font-serif text-5xl sm:text-6xl md:text-7xl leading-[1.1] mb-8 transform transition-all duration-1000 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              Find a court.<br />
              <em className="font-normal">Book it.</em><br />
              Go play.
            </h1>

            {/* Subtext */}
            <p className={`text-lg text-[#1c1917]/60 leading-relaxed mb-12 transform transition-all duration-1000 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              Discover available basketball courts at schools and community centers 
              near you. No phone calls, no waiting.
            </p>

            {/* CTA */}
            <div className={`transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Link 
                href="/search"
                className="group inline-flex items-center gap-4"
              >
                <span className="flex items-center justify-center w-14 h-14 bg-[#1c1917] text-white rounded-full group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
                <span className="text-lg font-medium">
                  See available courts
                </span>
              </Link>
            </div>

            {/* Trust Line */}
            <div className={`mt-16 pt-8 border-t border-[#1c1917]/10 transform transition-all duration-1000 delay-400 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <p className="text-sm text-[#1c1917]/40">
                Trusted by players, teams, and schools across Southern California
              </p>
            </div>
          </div>
        </div>

        {/* Right: Image */}
        <div className="flex-1 relative min-h-[50vh] lg:min-h-screen">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=1200&q=80')`,
            }}
          />
          {/* Floating Info Card */}
          <div className={`absolute bottom-8 left-8 right-8 sm:bottom-12 sm:left-12 sm:right-auto sm:max-w-xs p-6 bg-white/95 backdrop-blur rounded-2xl shadow-xl transform transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-2 h-2 bg-[#22c55e] rounded-full" />
              <span className="text-xs font-medium text-[#22c55e]">Available Now</span>
            </div>
            <h3 className="font-serif text-xl mb-1">Lincoln MS Gym</h3>
            <p className="text-sm text-[#1c1917]/50 mb-4">Indoor Basketball Court · $65/hr</p>
            <Link 
              href="/search"
              className="text-sm font-medium underline underline-offset-4 decoration-1 hover:decoration-2"
            >
              View availability →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works - Minimal */}
      <section className="px-8 py-32 sm:px-12 md:px-20 border-t border-[#1c1917]/5">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-20">
            <div>
              <span className="text-xs tracking-[0.3em] uppercase text-[#1c1917]/40 mb-4 block">
                How it works
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl">
                Three simple steps
              </h2>
            </div>
            <Link 
              href="/search"
              className="text-sm font-medium underline underline-offset-4 decoration-1 hover:decoration-2 self-start sm:self-auto"
            >
              Get started →
            </Link>
          </div>

          {/* Steps - Horizontal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              { num: '01', title: 'Discover', desc: 'Browse available courts at schools and recreation centers in your community.' },
              { num: '02', title: 'Book', desc: 'Reserve instantly or send a request—no phone calls, no back-and-forth.' },
              { num: '03', title: 'Play', desc: 'Show up at your reserved time. That\'s it.' },
            ].map((step, i) => (
              <div key={i} className="relative">
                <span className="font-serif text-7xl text-[#1c1917]/5 absolute -top-8 -left-4">
                  {step.num}
                </span>
                <div className="relative pt-8">
                  <h3 className="font-serif text-2xl mb-4">{step.title}</h3>
                  <p className="text-[#1c1917]/60 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courts */}
      <section className="px-8 py-32 sm:px-12 md:px-20 bg-[#1c1917] text-[#fcfaf8]">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-16">
            <div>
              <span className="text-xs tracking-[0.3em] uppercase text-[#fcfaf8]/40 mb-4 block">
                Featured
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl">
                Available courts
              </h2>
            </div>
            <Link 
              href="/venues"
              className="text-sm font-medium text-[#fcfaf8]/60 hover:text-[#fcfaf8] transition-colors self-start sm:self-auto"
            >
              View all courts →
            </Link>
          </div>

          {/* Courts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'Lincoln MS Gym', type: 'School Gymnasium', price: '$65', image: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600&q=80' },
              { name: 'Jefferson Rec Center', type: 'Recreation Center', price: '$55', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
              { name: 'Roosevelt Elementary', type: 'School Gymnasium', price: '$50', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80' },
            ].map((court, i) => (
              <Link
                key={i}
                href="/search"
                className="group"
              >
                <div className="aspect-[4/3] mb-4 rounded-lg overflow-hidden bg-[#fcfaf8]/10">
                  <div 
                    className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url('${court.image}')` }}
                  />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-lg mb-1">{court.name}</h3>
                    <p className="text-sm text-[#fcfaf8]/40">{court.type}</p>
                  </div>
                  <span className="text-lg font-medium">{court.price}<span className="text-sm text-[#fcfaf8]/40">/hr</span></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-8 py-32 sm:px-12 md:px-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-tight mb-8">
            Ready to find<br />
            <em className="font-normal">your court?</em>
          </h2>
          <Link 
            href="/search"
            className="inline-flex items-center gap-4 px-8 py-4 bg-[#1c1917] text-white rounded-full hover:bg-[#0c0a09] transition-colors"
          >
            <span className="font-medium">See available courts</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer - Ultra Minimal */}
      <footer className="px-8 py-12 sm:px-12 md:px-20 border-t border-[#1c1917]/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="font-serif text-lg">Play Bookings</span>
          <div className="flex items-center gap-8 text-sm text-[#1c1917]/40">
            <Link href="/become-a-host" className="hover:text-[#1c1917] transition-colors">List your court</Link>
            <Link href="/venues" className="hover:text-[#1c1917] transition-colors">All courts</Link>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
