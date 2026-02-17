'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

// Design 2: Brutalist Athletic
// Raw, industrial aesthetic with dark background, neon accents,
// time-centric showing "what's available NOW", blocky typography

export default function Design2() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#4ade80] selection:text-black">
      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Grid Lines */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-[5%] top-0 bottom-0 w-px bg-white/5" />
        <div className="absolute left-[95%] top-0 bottom-0 w-px bg-white/5" />
        <div className="absolute top-[5%] left-0 right-0 h-px bg-white/5" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-16 border-b border-white/10">
        <Link href="/" className="text-sm tracking-widest uppercase">
          Play_Bookings
        </Link>
        <div className="flex items-center gap-8">
          <span className="text-xs text-[#4ade80] tracking-wider">
            {currentTime ? formatTime(currentTime) : '--:--'}
          </span>
          <Link 
            href="/search" 
            className="px-4 py-2 text-xs tracking-widest uppercase border border-[#4ade80] text-[#4ade80] hover:bg-[#4ade80] hover:text-black transition-colors"
          >
            Book Now
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center px-[5%] pt-16">
        <div className="max-w-6xl">
          {/* Status Line */}
          <div className={`flex items-center gap-4 mb-8 transform transition-all duration-700 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
              <span className="text-xs tracking-widest text-[#4ade80] uppercase">Live</span>
            </div>
            <span className="text-xs text-white/40">Courts available now</span>
          </div>

          {/* Main Headline */}
          <h1 className={`transform transition-all duration-700 delay-100 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}>
            <span className="block text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] font-black tracking-tighter leading-[0.85] uppercase">
              No More
            </span>
            <span className="block text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] font-black tracking-tighter leading-[0.85] uppercase text-[#fb923c]">
              Locked
            </span>
            <span className="block text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] font-black tracking-tighter leading-[0.85] uppercase">
              Gyms<span className="text-[#4ade80]">.</span>
            </span>
          </h1>

          {/* Subtext */}
          <p className={`mt-8 sm:mt-12 text-white/50 text-sm sm:text-base max-w-md leading-relaxed transform transition-all duration-700 delay-200 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}>
            Real-time availability for basketball courts at schools, 
            community centers, and recreation facilities.
          </p>

          {/* CTA Grid */}
          <div className={`mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl transform transition-all duration-700 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <Link 
              href="/search"
              className="group flex items-center justify-between p-6 bg-[#4ade80] text-black hover:bg-[#22c55e] transition-colors"
            >
              <div>
                <span className="block text-xs tracking-widest uppercase mb-1">Action</span>
                <span className="block text-xl font-bold tracking-tight">Find open court →</span>
              </div>
            </Link>
            
            <Link 
              href="/venues"
              className="group flex items-center justify-between p-6 border border-white/20 hover:border-white/40 transition-colors"
            >
              <div>
                <span className="block text-xs tracking-widest uppercase mb-1 text-white/40">Browse</span>
                <span className="block text-xl font-bold tracking-tight">All courts →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Side Stats */}
        <div className="absolute right-[5%] top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-8 text-right">
          <div className={`transform transition-all duration-700 delay-400 ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
            <span className="block text-5xl font-black text-[#4ade80]">24</span>
            <span className="text-xs tracking-widest text-white/40 uppercase">Courts Online</span>
          </div>
          <div className={`transform transition-all duration-700 delay-500 ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
            <span className="block text-5xl font-black text-[#fb923c]">12</span>
            <span className="text-xs tracking-widest text-white/40 uppercase">Available Now</span>
          </div>
        </div>
      </section>

      {/* Time-Based Availability */}
      <section className="px-[5%] py-24 sm:py-32 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs tracking-widest text-[#4ade80] uppercase">Real-Time</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase mt-2">
                Next Available Slots
              </h2>
            </div>
            <span className="text-xs text-white/40">Updated live</span>
          </div>

          {/* Time Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
            {[
              { time: '18:00', court: 'Lincoln MS Gym', status: 'available' },
              { time: '18:30', court: 'Jefferson Rec Center', status: 'available' },
              { time: '19:00', court: 'Roosevelt Elementary', status: 'available' },
              { time: '19:00', court: 'Washington Heights', status: 'pending' },
              { time: '19:30', court: 'MLK Community Center', status: 'available' },
              { time: '20:00', court: 'Parkside Courts', status: 'available' },
            ].map((slot, i) => (
              <Link 
                key={i}
                href="/search"
                className="group bg-[#0a0a0a] p-6 hover:bg-[#111] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter">{slot.time}</span>
                  <span className={`px-2 py-1 text-[10px] tracking-widest uppercase ${
                    slot.status === 'available' 
                      ? 'bg-[#4ade80]/20 text-[#4ade80]' 
                      : 'bg-[#fb923c]/20 text-[#fb923c]'
                  }`}>
                    {slot.status}
                  </span>
                </div>
                <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                  {slot.court}
                </span>
                <span className="block mt-3 text-xs text-[#4ade80] opacity-0 group-hover:opacity-100 transition-opacity">
                  Book this slot →
                </span>
              </Link>
            ))}
          </div>

          {/* View All Link */}
          <Link 
            href="/search"
            className="mt-8 inline-flex items-center gap-2 text-xs tracking-widest uppercase text-white/40 hover:text-[#4ade80] transition-colors"
          >
            View all availability
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* How It Works - Brutalist */}
      <section className="px-[5%] py-24 sm:py-32 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            {[
              { num: '01', title: 'DISCOVER', desc: 'Find courts with real-time availability data' },
              { num: '02', title: 'BOOK', desc: 'Instant confirmation or quick request' },
              { num: '03', title: 'PLAY', desc: 'Show up. No calls. No friction.' },
            ].map((step, i) => (
              <div key={i} className="bg-[#0a0a0a] p-8 sm:p-12">
                <span className="text-6xl sm:text-7xl font-black text-white/10">{step.num}</span>
                <h3 className="mt-6 text-xl sm:text-2xl font-black tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-[5%] py-24 sm:py-32 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase">
            Stop Waiting<span className="text-[#4ade80]">.</span><br />
            <span className="text-[#fb923c]">Start Playing</span><span className="text-[#4ade80]">.</span>
          </h2>
          <Link 
            href="/search"
            className="mt-12 inline-block px-12 py-5 bg-[#4ade80] text-black text-sm font-bold tracking-widest uppercase hover:bg-[#22c55e] transition-colors"
          >
            Find a Court Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-[5%] py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30 tracking-widest uppercase">
          <span>© 2026 Play_Bookings</span>
          <div className="flex gap-8">
            <Link href="/become-a-host" className="hover:text-[#4ade80] transition-colors">Host</Link>
            <Link href="/venues" className="hover:text-[#4ade80] transition-colors">Courts</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
