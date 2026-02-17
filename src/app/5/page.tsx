'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

// Design 5: Retro-Futuristic
// 90s sports energy meets modern, gradient overlays, geometric shapes,
// retro basketball aesthetics, Gatorade-era color palette, animated elements

export default function Design5() {
  const [mounted, setMounted] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-hidden">
      {/* Animated Gradient Background */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `
            radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(34, 197, 94, 0.15) 0%, transparent 50%),
            radial-gradient(circle at ${100 - mousePosition.x}% ${100 - mousePosition.y}%, rgba(251, 146, 60, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #0f172a 0%, #1e293b 100%)
          `,
        }}
      />

      {/* Geometric Pattern Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          {/* Retro Logo */}
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4ade80] via-[#22c55e] to-[#15803d] rounded-xl rotate-12" />
            <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-[#fb923c] via-[#f97316] to-[#ea580c] rounded-xl -rotate-6 opacity-60" />
          </div>
          <span className="text-xl font-black tracking-tight uppercase">
            Play<span className="text-[#4ade80]">.</span>Bookings
          </span>
        </Link>
        <Link 
          href="/search" 
          className="px-6 py-3 bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#0f172a] text-sm font-bold uppercase tracking-wider rounded-lg hover:from-[#22c55e] hover:to-[#16a34a] transition-all hover:scale-105"
        >
          Find Courts
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-24 sm:px-10 sm:pt-24 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Floating Badge */}
          <div className={`inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur transform transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#4ade80]"></span>
            </span>
            <span className="text-sm font-medium">Courts open now</span>
          </div>

          {/* Main Headline - Retro Typography */}
          <div className={`relative transform transition-all duration-700 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase leading-[0.9] tracking-tight">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60">
                Just
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#22c55e]">
                Play
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#fb923c] to-[#f97316]">
                Already
              </span>
            </h1>

            {/* Decorative Element */}
            <div className="absolute -right-4 top-0 w-32 h-32 sm:w-48 sm:h-48 opacity-20">
              <div className="w-full h-full border-4 border-[#4ade80] rounded-full animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute inset-4 border-4 border-[#fb923c] rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
            </div>
          </div>

          {/* Subtext */}
          <p className={`mt-8 text-lg sm:text-xl text-white/60 max-w-lg leading-relaxed transform transition-all duration-700 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            Real-time court availability. Instant booking. 
            No phone calls. No locked gyms. Just you and the game.
          </p>

          {/* CTA Buttons */}
          <div className={`mt-10 flex flex-col sm:flex-row gap-4 transform transition-all duration-700 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <Link 
              href="/search"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#0f172a] font-bold uppercase tracking-wider rounded-xl overflow-hidden hover:scale-105 transition-transform"
            >
              <span className="relative z-10">See Available Courts</span>
              <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-r from-[#22c55e] to-[#16a34a] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            
            <Link 
              href="/venues"
              className="inline-flex items-center justify-center gap-3 px-8 py-5 border-2 border-white/20 text-white font-bold uppercase tracking-wider rounded-xl hover:border-[#4ade80] hover:text-[#4ade80] transition-colors"
            >
              Browse All Courts
            </Link>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-6">
          {[
            { value: '24', label: 'COURTS', color: 'from-[#4ade80] to-[#22c55e]' },
            { value: '7', label: 'CITIES', color: 'from-[#fb923c] to-[#f97316]' },
            { value: '∞', label: 'GAMES', color: 'from-white/60 to-white/40' },
          ].map((stat, i) => (
            <div 
              key={i}
              className={`text-right transform transition-all duration-700 ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
              style={{ transitionDelay: `${400 + i * 100}ms` }}
            >
              <span className={`block text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                {stat.value}
              </span>
              <span className="text-xs tracking-widest text-white/40">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Court Preview Cards */}
      <section className="relative px-6 py-16 sm:px-10">
        <div className="max-w-6xl mx-auto">
          {/* Scrolling Cards */}
          <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 scrollbar-hide">
            {[
              { name: 'Lincoln MS Gym', time: '6:00 PM', status: 'Open', gradient: 'from-[#4ade80]/20 to-[#22c55e]/5' },
              { name: 'Jefferson Rec', time: '6:30 PM', status: 'Open', gradient: 'from-[#fb923c]/20 to-[#f97316]/5' },
              { name: 'Roosevelt Elem', time: '7:00 PM', status: 'Open', gradient: 'from-[#4ade80]/20 to-[#22c55e]/5' },
              { name: 'MLK Center', time: '7:30 PM', status: 'Open', gradient: 'from-[#fb923c]/20 to-[#f97316]/5' },
            ].map((court, i) => (
              <Link
                key={i}
                href="/search"
                className={`group relative flex-shrink-0 w-72 p-6 bg-gradient-to-br ${court.gradient} border border-white/10 rounded-2xl backdrop-blur hover:border-[#4ade80]/50 transition-all hover:-translate-y-2 transform duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{ transitionDelay: `${500 + i * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-1 bg-[#4ade80]/20 text-[#4ade80] text-xs font-bold uppercase tracking-wider rounded">
                    {court.status}
                  </span>
                  <span className="text-2xl font-black">{court.time}</span>
                </div>
                <h3 className="text-lg font-bold mb-1">{court.name}</h3>
                <p className="text-sm text-white/40">Indoor Basketball Court</p>
                <div className="mt-4 flex items-center gap-2 text-[#4ade80] font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Book Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                {/* Corner Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rotate-45 translate-x-16 -translate-y-16" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Geometric */}
      <section className="relative px-6 py-24 sm:px-10 sm:py-32">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-[#fb923c]/20 to-[#f97316]/10 text-[#fb923c] text-xs font-bold uppercase tracking-widest rounded-full mb-4">
              How It Works
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                Get In The
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#22c55e]">
                Game
              </span>
            </h2>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '01', title: 'DISCOVER', desc: 'Find courts with real-time availability at schools and rec centers.', accent: '#4ade80' },
              { num: '02', title: 'BOOK', desc: 'Reserve instantly or send a quick request. No phone calls.', accent: '#fb923c' },
              { num: '03', title: 'PLAY', desc: 'Show up and ball out. It\'s that simple.', accent: '#4ade80' },
            ].map((step, i) => (
              <div 
                key={i}
                className="relative p-8 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/10 transition-colors"
              >
                {/* Number */}
                <span 
                  className="absolute -top-6 -left-2 text-8xl font-black opacity-10"
                  style={{ color: step.accent }}
                >
                  {step.num}
                </span>
                <div className="relative">
                  <div 
                    className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${step.accent}33, ${step.accent}11)` }}
                  >
                    <span className="text-lg font-black" style={{ color: step.accent }}>{step.num}</span>
                  </div>
                  <h3 className="text-xl font-black uppercase mb-3 tracking-wide">{step.title}</h3>
                  <p className="text-white/50">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-6 py-24 sm:px-10 sm:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Decorative Elements */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-30">
            <div className="absolute inset-0 border-2 border-[#4ade80] rounded-full animate-pulse" />
            <div className="absolute inset-8 border-2 border-[#fb923c] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-16 border-2 border-white/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">
                Stop Waiting
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#fb923c]">
                Start Playing
              </span>
            </h2>
            <Link 
              href="/search"
              className="mt-12 inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#0f172a] font-bold uppercase tracking-wider rounded-xl hover:scale-105 transition-transform"
            >
              Find a Court Now
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 px-6 py-8 sm:px-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4ade80] to-[#22c55e] rounded-lg" />
            <span className="font-black uppercase tracking-tight">Play.Bookings</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-white/40">
            <Link href="/become-a-host" className="hover:text-[#4ade80] transition-colors uppercase tracking-wider">Host</Link>
            <Link href="/venues" className="hover:text-[#4ade80] transition-colors uppercase tracking-wider">Courts</Link>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
