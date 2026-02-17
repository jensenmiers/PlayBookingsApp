'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

// Design 3: Soft Organic
// Rounded shapes, flowing curves, soft pastels with green/orange accents,
// community-forward imagery, gentle animations, playful micro-interactions

export default function Design3() {
  const [mounted, setMounted] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#fef9f3] text-[#2d2a26] overflow-hidden">
      {/* Soft Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-gradient-to-br from-[#bbf7d0]/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[50%] h-[50%] bg-gradient-to-tr from-[#fed7aa]/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-gradient-to-r from-[#bbf7d0]/20 to-[#fed7aa]/20 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#4ade80] to-[#22c55e] rounded-2xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <span className="text-xl font-semibold">Play Bookings</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/become-a-host" className="hidden sm:block text-sm text-[#2d2a26]/60 hover:text-[#2d2a26] transition-colors">
            List your court
          </Link>
          <Link 
            href="/search" 
            className="px-6 py-3 text-sm font-medium bg-[#2d2a26] text-white rounded-full hover:bg-[#1a1916] transition-colors"
          >
            Find Courts
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-12 pb-24 sm:px-10 sm:pt-20 sm:pb-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Playful Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full shadow-sm mb-8 transform transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
            <span className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
            <span className="text-sm text-[#2d2a26]/70">Courts available now in your area</span>
          </div>

          {/* Main Headline */}
          <h1 className={`text-4xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6 transform transition-all duration-700 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <span className="block">Your community&apos;s</span>
            <span className="block">
              courts—
              <span className="relative inline-block">
                <span className="relative z-10 text-[#16a34a]">open</span>
                <svg className="absolute -bottom-2 left-0 w-full h-4 text-[#bbf7d0]" viewBox="0 0 100 12" preserveAspectRatio="none">
                  <path d="M0,8 Q25,0 50,8 T100,8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </span>
            <span className="block">when you need them</span>
          </h1>

          {/* Subtext */}
          <p className={`text-lg sm:text-xl text-[#2d2a26]/60 max-w-xl mx-auto mb-10 transform transition-all duration-700 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            Discover available basketball courts at schools and community centers. 
            Book in seconds. No phone calls.
          </p>

          {/* Search Card */}
          <div className={`max-w-lg mx-auto transform transition-all duration-700 delay-300 ${mounted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}>
            <Link 
              href="/search"
              className="group flex items-center justify-between w-full p-5 sm:p-6 bg-white rounded-3xl shadow-lg shadow-[#2d2a26]/5 hover:shadow-xl hover:shadow-[#4ade80]/10 transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f0fdf4] rounded-2xl flex items-center justify-center group-hover:bg-[#dcfce7] transition-colors">
                  <svg className="w-6 h-6 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="block text-lg font-semibold">See available courts</span>
                  <span className="block text-sm text-[#2d2a26]/50">Browse times and locations</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center group-hover:bg-[#22c55e] transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Floating Court Cards */}
        <div className="mt-16 sm:mt-24 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            {[
              { name: 'Lincoln MS Gym', time: '6:00 PM', color: 'from-[#4ade80]/20 to-[#4ade80]/5' },
              { name: 'Jefferson Rec', time: '6:30 PM', color: 'from-[#fb923c]/20 to-[#fb923c]/5' },
              { name: 'Roosevelt Elem', time: '7:00 PM', color: 'from-[#4ade80]/20 to-[#4ade80]/5' },
            ].map((court, i) => (
              <Link
                key={i}
                href="/search"
                className={`group relative flex-1 max-w-xs mx-auto sm:mx-0 p-6 bg-white rounded-3xl shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
                style={{ transitionDelay: `${400 + i * 100}ms` }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${court.color} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-[#f0fdf4] text-[#16a34a] text-xs font-medium rounded-full">
                      Available
                    </span>
                    <span className="text-2xl font-bold">{court.time}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{court.name}</h3>
                  <p className="text-sm text-[#2d2a26]/50">Indoor Basketball Court</p>
                  <div className={`mt-4 flex items-center gap-2 text-sm text-[#16a34a] font-medium transition-all duration-300 ${hoveredCard === i ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                    Book now
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Organic */}
      <section className="relative px-6 py-24 sm:px-10 sm:py-32">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-[#fed7aa]/30 text-[#c2410c] text-sm font-medium rounded-full mb-4">
              Simple as 1-2-3
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Find your next game
            </h2>
          </div>

          {/* Steps */}
          <div className="space-y-8 sm:space-y-12">
            {[
              { num: 1, title: 'Discover courts nearby', desc: 'Browse available basketball courts at schools and recreation centers in your community.', icon: '🔍', color: 'bg-[#dcfce7]' },
              { num: 2, title: 'Book in seconds', desc: 'Instant booking for approved facilities, or send a quick request—no phone calls needed.', icon: '⚡', color: 'bg-[#fef3c7]' },
              { num: 3, title: 'Show up and play', desc: 'Your confirmation is all you need. Just bring your game.', icon: '🏀', color: 'bg-[#fee2e2]' },
            ].map((step, i) => (
              <div 
                key={i}
                className="flex items-start gap-6 p-6 sm:p-8 bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center text-2xl shrink-0`}>
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-6 h-6 bg-[#2d2a26] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {step.num}
                    </span>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-[#2d2a26]/60 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="relative px-6 py-24 sm:px-10 sm:py-32 bg-gradient-to-b from-white/50 to-transparent">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Built for players,<br />
            <span className="text-[#16a34a]">by players</span>
          </h2>
          <p className="text-lg text-[#2d2a26]/60 max-w-xl mx-auto mb-12">
            We&apos;re unlocking community spaces so everyone can find a court 
            to play on—without the hassle.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
            {[
              { value: '50+', label: 'Courts Listed' },
              { value: '1,000+', label: 'Hours Booked' },
              { value: '4.9', label: 'Avg Rating' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <span className="block text-4xl sm:text-5xl font-bold text-[#16a34a]">{stat.value}</span>
                <span className="text-sm text-[#2d2a26]/50">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-6 py-24 sm:px-10 sm:py-32">
        <div className="max-w-2xl mx-auto">
          <div className="relative p-8 sm:p-12 bg-gradient-to-br from-[#16a34a] to-[#15803d] rounded-[2rem] text-white text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full" />
            
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to play?
              </h2>
              <p className="text-white/80 mb-8 max-w-md mx-auto">
                Find an available court in your area and book your next game in seconds.
              </p>
              <Link 
                href="/search"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#16a34a] font-semibold rounded-full hover:bg-[#f0fdf4] transition-colors"
              >
                See Available Courts
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 sm:px-10 border-t border-[#2d2a26]/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#2d2a26]/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4ade80] to-[#22c55e] rounded-xl" />
            <span>Play Bookings © 2026</span>
          </div>
          <div className="flex gap-6">
            <Link href="/become-a-host" className="hover:text-[#2d2a26] transition-colors">List your court</Link>
            <Link href="/venues" className="hover:text-[#2d2a26] transition-colors">Browse courts</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
