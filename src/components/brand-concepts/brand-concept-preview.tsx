import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'

export const BRAND_CONCEPT_IDS = ['1', '2', '3', '4'] as const

export type BrandConceptId = (typeof BRAND_CONCEPT_IDS)[number]

type ConceptTheme = {
  id: BrandConceptId
  name: string
  shortName: string
  thesis: string
  signatureCopy: string
  allocation: string
  page: string
  chrome: string
  chromeBorder: string
  logoText: string
  reviewPill: string
  switcher: string
  switcherActive: string
  switcherInactive: string
  eyebrow: string
  headlineAccent: string
  heroCopy: string
  heroCta: string
  heroCtaNote: string
  heroFrame: string
  heroOverlay: string
  heroBadge: string
  heroBadgeDot: string
  rule: string
  sectionLabel: string
  sectionCopy: string
  filterShell: string
  filterActive: string
  filterInactive: string
  card: string
  cardBorder: string
  cardCopy: string
  privatePill: string
  openGymPill: string
  availability: string
  cardAction: string
  bookingPanel: string
  bookingMuted: string
  bookingTime: string
  bookingCta: string
  thesisPanel: string
  thesisMuted: string
  swatches: Array<{ label: string; className: string; role: string }>
}

export const BRAND_CONCEPTS: Record<BrandConceptId, ConceptTheme> = {
  '1': {
    id: '1',
    name: 'Tune, don’t rebrand',
    shortName: 'Tune',
    thesis:
      'Keep the current warm, editorial atmosphere. Make the purchased orange sharper and more deliberate while green remains the trusted booking signal.',
    signatureCopy: 'Green still closes the booking.',
    allocation: 'Orange for voice · Green for action · Espresso for atmosphere',
    page: 'bg-secondary-900 text-secondary-50',
    chrome: 'bg-secondary-900/90',
    chromeBorder: 'border-secondary-50/10',
    logoText: 'text-secondary-50',
    reviewPill: 'border-accent-400/30 bg-accent-400/10 text-accent-300',
    switcher: 'border-secondary-50/10 bg-secondary-800/80',
    switcherActive: 'bg-secondary-50 text-secondary-900',
    switcherInactive: 'text-secondary-50/50 hover:text-secondary-50',
    eyebrow: 'text-[#FF671A]',
    headlineAccent: 'text-primary-400',
    heroCopy: 'text-secondary-50/65',
    heroCta: 'bg-secondary-50 text-secondary-900 hover:bg-primary-400',
    heroCtaNote: 'text-secondary-50/45',
    heroFrame: 'border-secondary-50/10 bg-secondary-800',
    heroOverlay:
      'bg-gradient-to-t from-secondary-900 via-secondary-900/25 to-transparent',
    heroBadge: 'border-secondary-50/15 bg-secondary-900/75 text-secondary-50',
    heroBadgeDot: 'bg-primary-400',
    rule: 'from-[#FF671A] via-accent-300 to-primary-400',
    sectionLabel: 'text-[#FF671A]',
    sectionCopy: 'text-secondary-50/55',
    filterShell: 'border-secondary-50/10 bg-secondary-800',
    filterActive: 'bg-primary-400 text-secondary-900',
    filterInactive: 'text-secondary-50/55 hover:bg-secondary-700 hover:text-secondary-50',
    card: 'bg-secondary-800',
    cardBorder: 'border-secondary-50/10 hover:border-primary-400/40',
    cardCopy: 'text-secondary-50/55',
    privatePill: 'border-primary-400/25 bg-primary-400/10 text-primary-300',
    openGymPill: 'border-[#FF671A]/30 bg-[#FF671A]/10 text-[#FF894D]',
    availability: 'text-primary-400',
    cardAction: 'text-secondary-50 hover:text-primary-300',
    bookingPanel: 'border-secondary-50/10 bg-secondary-800',
    bookingMuted: 'text-secondary-50/45',
    bookingTime: 'border-primary-400/25 bg-primary-400/10 text-primary-300',
    bookingCta: 'bg-primary-400 text-secondary-900 hover:bg-primary-300',
    thesisPanel: 'border-secondary-50/10 bg-secondary-800/65',
    thesisMuted: 'text-secondary-50/55',
    swatches: [
      { label: 'Brand', className: 'bg-[#FF671A]', role: 'Voice + Open Gym' },
      { label: 'Action', className: 'bg-primary-400', role: 'Book + confirm' },
      { label: 'Ground', className: 'bg-secondary-900', role: 'Warm product canvas' },
    ],
  },
  '2': {
    id: '2',
    name: 'Two-speed brand',
    shortName: 'Two-speed',
    thesis:
      'Use orange to create appetite during discovery, then hand the user to green when a real slot becomes available and commitment begins.',
    signatureCopy: 'Orange gets attention. Green earns commitment.',
    allocation: 'Orange for discovery · Green for certainty · Navy for structure',
    page: 'bg-[#1F2937] text-secondary-50',
    chrome: 'bg-[#1F2937]/90',
    chromeBorder: 'border-secondary-50/10',
    logoText: 'text-secondary-50',
    reviewPill: 'border-[#FF671A]/35 bg-[#FF671A]/12 text-[#FFA077]',
    switcher: 'border-secondary-50/10 bg-[#263449]/85',
    switcherActive: 'bg-[#FF671A] text-[#1F2937]',
    switcherInactive: 'text-secondary-50/55 hover:text-secondary-50',
    eyebrow: 'text-[#FF894D]',
    headlineAccent: 'text-[#FF671A]',
    heroCopy: 'text-secondary-50/68',
    heroCta: 'bg-[#FF671A] text-[#1F2937] hover:bg-[#FF894D]',
    heroCtaNote: 'text-secondary-50/45',
    heroFrame: 'border-secondary-50/10 bg-[#263449]',
    heroOverlay:
      'bg-gradient-to-tr from-[#1F2937] via-[#1F2937]/20 to-[#FF671A]/20',
    heroBadge: 'border-primary-300/25 bg-[#1F2937]/80 text-secondary-50',
    heroBadgeDot: 'bg-primary-400',
    rule: 'from-[#FF671A] via-[#FF894D] to-primary-400',
    sectionLabel: 'text-[#FF894D]',
    sectionCopy: 'text-secondary-50/58',
    filterShell: 'border-secondary-50/10 bg-[#263449]',
    filterActive: 'bg-[#FF671A] text-[#1F2937]',
    filterInactive: 'text-secondary-50/58 hover:bg-secondary-50/10 hover:text-secondary-50',
    card: 'bg-[#263449]',
    cardBorder: 'border-secondary-50/10 hover:border-[#FF671A]/45',
    cardCopy: 'text-secondary-50/55',
    privatePill: 'border-primary-300/25 bg-primary-400/10 text-primary-300',
    openGymPill: 'border-[#FF671A]/35 bg-[#FF671A]/12 text-[#FFA077]',
    availability: 'text-primary-400',
    cardAction: 'text-secondary-50 hover:text-[#FF894D]',
    bookingPanel: 'border-secondary-50/10 bg-[#263449]',
    bookingMuted: 'text-secondary-50/48',
    bookingTime: 'border-primary-300/25 bg-primary-400/10 text-primary-300',
    bookingCta: 'bg-primary-400 text-[#1F2937] hover:bg-primary-300',
    thesisPanel: 'border-secondary-50/10 bg-[#263449]/80',
    thesisMuted: 'text-secondary-50/58',
    swatches: [
      { label: 'Discover', className: 'bg-[#FF671A]', role: 'Browse + explore' },
      { label: 'Commit', className: 'bg-primary-400', role: 'Slot + booking' },
      { label: 'Structure', className: 'bg-[#1F2937]', role: 'Cool brand canvas' },
    ],
  },
  '3': {
    id: '3',
    name: 'Orange-first relaunch',
    shortName: 'Orange-first',
    thesis:
      'Let the purchased kit own the interface. Orange becomes the unmistakable PlayBookings action color while green steps back to availability and success.',
    signatureCopy: 'Play louder. Book faster.',
    allocation: 'Orange for brand + action · Green for status · White for breathing room',
    page: 'bg-[#FFF8F4] text-[#1F2937]',
    chrome: 'bg-[#FFF8F4]/90',
    chromeBorder: 'border-[#1F2937]/10',
    logoText: 'text-[#1F2937]',
    reviewPill: 'border-[#FF671A]/30 bg-[#FF671A]/10 text-[#B33C00]',
    switcher: 'border-[#1F2937]/10 bg-secondary-50',
    switcherActive: 'bg-[#1F2937] text-secondary-50',
    switcherInactive: 'text-[#1F2937]/50 hover:text-[#1F2937]',
    eyebrow: 'text-[#B33C00]',
    headlineAccent: 'text-[#FF671A]',
    heroCopy: 'text-[#1F2937]/65',
    heroCta: 'bg-[#FF671A] text-[#1F2937] hover:bg-[#FF894D]',
    heroCtaNote: 'text-[#1F2937]/48',
    heroFrame: 'border-[#1F2937]/10 bg-[#FF671A]',
    heroOverlay:
      'bg-gradient-to-t from-[#1F2937]/90 via-[#1F2937]/15 to-transparent',
    heroBadge: 'border-secondary-50/20 bg-[#1F2937]/80 text-secondary-50',
    heroBadgeDot: 'bg-primary-400',
    rule: 'from-[#FF671A] via-[#FF894D] to-[#FFCCB3]',
    sectionLabel: 'text-[#B33C00]',
    sectionCopy: 'text-[#1F2937]/58',
    filterShell: 'border-[#1F2937]/10 bg-secondary-50 shadow-soft',
    filterActive: 'bg-[#FF671A] text-[#1F2937]',
    filterInactive: 'text-[#1F2937]/55 hover:bg-[#FFCCB3]/40 hover:text-[#1F2937]',
    card: 'bg-secondary-50',
    cardBorder: 'border-[#1F2937]/10 hover:border-[#FF671A]/55',
    cardCopy: 'text-[#1F2937]/55',
    privatePill: 'border-secondary-50/20 bg-[#1F2937]/80 text-secondary-50',
    openGymPill: 'border-[#FF671A]/35 bg-[#FF671A]/10 text-[#B33C00]',
    availability: 'text-primary-700',
    cardAction: 'text-[#1F2937] hover:text-[#B33C00]',
    bookingPanel: 'border-[#1F2937]/10 bg-[#1F2937] text-secondary-50',
    bookingMuted: 'text-secondary-50/50',
    bookingTime: 'border-primary-300/30 bg-primary-400/12 text-primary-300',
    bookingCta: 'bg-[#FF671A] text-[#1F2937] hover:bg-[#FF894D]',
    thesisPanel: 'border-[#FF671A]/25 bg-[#FFCCB3]/35',
    thesisMuted: 'text-[#1F2937]/60',
    swatches: [
      { label: 'Primary', className: 'bg-[#FF671A]', role: 'Brand + CTA' },
      { label: 'Signal', className: 'bg-primary-400', role: 'Available + success' },
      { label: 'Canvas', className: 'bg-secondary-50', role: 'Clean marketplace' },
    ],
  },
  '4': {
    id: '4',
    name: 'New foundation, familiar signals',
    shortName: 'Familiar',
    thesis:
      'Adopt the purchased navy as the structural foundation while preserving PlayBookings’ existing warm orange, bright green, and warm neutral system.',
    signatureCopy: 'A sharper frame. The same PlayBookings instincts.',
    allocation: 'Kit navy for structure · Existing orange for warmth · Existing green for action',
    page: 'bg-[#1F2937] text-secondary-50',
    chrome: 'bg-[#1F2937]/90',
    chromeBorder: 'border-secondary-50/10',
    logoText: 'text-secondary-50',
    reviewPill: 'border-accent-400/30 bg-accent-400/10 text-accent-300',
    switcher: 'border-secondary-50/10 bg-secondary-800/80',
    switcherActive: 'bg-accent-400 text-[#1F2937]',
    switcherInactive: 'text-secondary-50/55 hover:text-secondary-50',
    eyebrow: 'text-accent-300',
    headlineAccent: 'text-accent-400',
    heroCopy: 'text-secondary-50/68',
    heroCta: 'bg-primary-400 text-[#1F2937] hover:bg-primary-300',
    heroCtaNote: 'text-secondary-50/48',
    heroFrame: 'border-secondary-50/10 bg-secondary-800',
    heroOverlay:
      'bg-gradient-to-tr from-[#1F2937] via-[#1F2937]/35 to-accent-400/15',
    heroBadge: 'border-secondary-50/15 bg-[#1F2937]/80 text-secondary-50',
    heroBadgeDot: 'bg-primary-400',
    rule: 'from-accent-600 via-accent-400 to-primary-400',
    sectionLabel: 'text-accent-300',
    sectionCopy: 'text-secondary-50/58',
    filterShell: 'border-secondary-50/10 bg-secondary-800',
    filterActive: 'bg-accent-400 text-[#1F2937]',
    filterInactive: 'text-secondary-50/58 hover:bg-secondary-700 hover:text-secondary-50',
    card: 'bg-secondary-800',
    cardBorder: 'border-secondary-50/10 hover:border-accent-400/45',
    cardCopy: 'text-secondary-50/58',
    privatePill: 'border-primary-300/25 bg-primary-400/10 text-primary-300',
    openGymPill: 'border-accent-400/30 bg-accent-400/10 text-accent-300',
    availability: 'text-primary-400',
    cardAction: 'text-secondary-50 hover:text-accent-300',
    bookingPanel: 'border-secondary-50/10 bg-secondary-800',
    bookingMuted: 'text-secondary-50/48',
    bookingTime: 'border-primary-300/25 bg-primary-400/10 text-primary-300',
    bookingCta: 'bg-primary-400 text-[#1F2937] hover:bg-primary-300',
    thesisPanel: 'border-accent-400/20 bg-secondary-800/80',
    thesisMuted: 'text-secondary-50/58',
    swatches: [
      { label: 'Foundation', className: 'bg-[#1F2937]', role: 'New kit navy' },
      { label: 'Warmth', className: 'bg-accent-400', role: 'Existing PlayBookings orange' },
      { label: 'Action', className: 'bg-primary-400', role: 'Existing booking green' },
    ],
  },
}

type VenuePreview = {
  name: string
  type: string
  access: 'Private Rental' | 'Open Gym'
  availability: string
  price: string
  crop: string
}

const VENUES: VenuePreview[] = [
  {
    name: 'JEM Community Center',
    type: 'Full court · Los Angeles',
    access: 'Private Rental',
    availability: 'Today · 6:00 PM',
    price: '$85/hr',
    crop: 'object-[38%_center]',
  },
  {
    name: 'Crossroads School',
    type: 'School gymnasium · Santa Monica',
    access: 'Open Gym',
    availability: 'Thursday · 7:30 PM',
    price: '$12 entry',
    crop: 'object-[25%_center]',
  },
  {
    name: 'Terasaki Budokan',
    type: 'Recreation center · Little Tokyo',
    access: 'Private Rental',
    availability: 'Friday · 5:00 PM',
    price: '$100/hr',
    crop: 'object-[62%_center]',
  },
]

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  )
}

function ConceptSwitcher({
  concept,
  theme,
}: {
  concept: BrandConceptId
  theme: ConceptTheme
}) {
  return (
    <nav
      aria-label="Brand concept switcher"
      className={cn(
        'flex items-center gap-xxs rounded-full border p-xxs backdrop-blur-xl',
        theme.switcher
      )}
    >
      {BRAND_CONCEPT_IDS.map((id) => (
        <Link
          key={id}
          aria-current={concept === id ? 'page' : undefined}
          aria-label={`Concept ${id}: ${BRAND_CONCEPTS[id].shortName}`}
          href={`/brand-concepts/${id}`}
          className={cn(
            'flex min-h-9 items-center gap-xs rounded-full px-m text-xs font-semibold transition-colors sm:px-l',
            concept === id ? theme.switcherActive : theme.switcherInactive
          )}
        >
          <span className="font-mono text-[10px] opacity-60">0{id}</span>
          <span className="hidden sm:inline">{BRAND_CONCEPTS[id].shortName}</span>
        </Link>
      ))}
    </nav>
  )
}

function VenueCard({
  venue,
  theme,
}: {
  venue: VenuePreview
  theme: ConceptTheme
}) {
  const accessClass =
    venue.access === 'Open Gym' ? theme.openGymPill : theme.privatePill

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-3xl border transition-all duration-500 hover:-translate-y-1 hover:shadow-glass',
        theme.card,
        theme.cardBorder
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src="/og-default-v3.jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 100vw"
          className={cn(
            'object-cover saturate-[0.8] transition-transform duration-700 group-hover:scale-105',
            venue.crop
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-900/80 via-transparent to-transparent" />
        <span
          className={cn(
            'absolute left-l top-l rounded-full border px-m py-xs text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md',
            accessClass
          )}
        >
          {venue.access}
        </span>
        <span className="absolute bottom-l right-l rounded-full bg-secondary-900/75 px-m py-xs text-sm font-semibold text-secondary-50 backdrop-blur-md">
          {venue.price}
        </span>
      </div>

      <div className="p-xl">
        <p className={cn('text-xs font-semibold uppercase tracking-[0.16em]', theme.availability)}>
          <span className="mr-s inline-block size-s rounded-full bg-current shadow-[0_0_0.75rem_currentColor]" />
          {venue.availability}
        </p>
        <h3 className="mt-m font-serif text-2xl leading-tight">{venue.name}</h3>
        <p className={cn('mt-xs text-sm', theme.cardCopy)}>{venue.type}</p>
        <Link
          href="#booking-preview"
          className={cn(
            'mt-xl inline-flex items-center gap-s text-sm font-semibold transition-colors',
            theme.cardAction
          )}
        >
          View times
          <ArrowIcon className="size-l transition-transform group-hover:translate-x-xs" />
        </Link>
      </div>
    </article>
  )
}

export function BrandConceptPreview({ concept }: { concept: BrandConceptId }) {
  const theme = BRAND_CONCEPTS[concept]

  return (
    <main className={cn('min-h-screen overflow-x-clip', theme.page)}>
      <header
        className={cn(
          'sticky top-0 z-50 border-b backdrop-blur-xl',
          theme.chrome,
          theme.chromeBorder
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-s px-l py-m sm:px-xl lg:px-2xl">
          <Link
            href="/"
            className={cn('flex items-center gap-s font-semibold tracking-tight', theme.logoText)}
          >
            <Image aria-hidden="true" src="/icon.png" alt="" width={32} height={32} className="size-8" />
            <span>Play Bookings</span>
          </Link>

          <div className="flex items-center gap-s">
            <span
              className={cn(
                'hidden rounded-full border px-m py-xs text-[10px] font-semibold uppercase tracking-[0.14em] md:inline-flex',
                theme.reviewPill
              )}
            >
              Brand study · review only
            </span>
            <ConceptSwitcher concept={concept} theme={theme} />
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[42rem] max-w-6xl items-center gap-3xl px-l py-5xl sm:px-xl lg:grid-cols-[1.05fr_0.95fr] lg:px-2xl lg:py-6xl">
        <div className="relative z-10">
          <p className={cn('text-xs font-semibold uppercase tracking-[0.24em]', theme.eyebrow)}>
            Concept 0{concept} · {theme.allocation}
          </p>

          <h1 className="mt-xl font-serif tracking-[-0.045em]">
            <span className="mb-xl block font-sans text-sm font-semibold uppercase tracking-[0.18em] opacity-55">
              {theme.name}
            </span>
            <span className="block text-5xl leading-[0.92] sm:text-7xl lg:text-[5.5rem]">
              Find a court.
            </span>
            <span
              className={cn(
                'block text-5xl leading-[0.92] sm:text-7xl lg:text-[5.5rem]',
                theme.headlineAccent
              )}
            >
              Book it.
            </span>
            <span className="block text-5xl italic leading-[0.92] sm:text-7xl lg:text-[5.5rem]">
              Go play.
            </span>
          </h1>

          <p className={cn('mt-2xl max-w-xl text-base leading-relaxed sm:text-lg', theme.heroCopy)}>
            {theme.thesis}
          </p>

          <div className="mt-2xl flex flex-col items-start gap-m sm:flex-row sm:items-center">
            <Link
              href="#courts"
              className={cn(
                'group inline-flex min-h-12 items-center justify-center gap-l whitespace-nowrap rounded-full px-xl text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5',
                theme.heroCta
              )}
            >
              See available courts
              <ArrowIcon className="size-l transition-transform group-hover:translate-x-xs" />
            </Link>
            <p className={cn('text-sm', theme.heroCtaNote)}>{theme.signatureCopy}</p>
          </div>
        </div>

        <div
          className={cn(
            'relative min-h-[30rem] overflow-hidden rounded-[2.5rem] border shadow-glass',
            theme.heroFrame
          )}
        >
          <Image
            src="/og-default-v3.jpg"
            alt="Basketball dropping beneath an indoor hoop"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover object-[42%_center] saturate-[0.75]"
          />
          <div className={cn('absolute inset-0', theme.heroOverlay)} />
          <div className="absolute inset-x-l bottom-l sm:inset-x-xl sm:bottom-xl">
            <div
              className={cn(
                'flex items-center justify-between gap-l rounded-2xl border p-l backdrop-blur-xl sm:p-xl',
                theme.heroBadge
              )}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] opacity-55">
                  Next available
                </p>
                <p className="mt-xs text-lg font-semibold">Tonight · 6:00 PM</p>
                <p className="mt-xxs text-xs opacity-55">JEM Community Center</p>
              </div>
              <div className="flex items-center gap-s">
                <span className={cn('size-s rounded-full', theme.heroBadgeDot)} />
                <span className="text-sm font-semibold">$85/hr</span>
              </div>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className={cn(
            'absolute -bottom-px left-1/2 h-px w-screen -translate-x-1/2 bg-gradient-to-r',
            theme.rule
          )}
        />
      </section>

      <section id="courts" className="mx-auto max-w-6xl px-l py-5xl sm:px-xl lg:px-2xl lg:py-6xl">
        <div className="flex flex-col gap-xl lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.22em]', theme.sectionLabel)}>
              Discovery surface
            </p>
            <h2 className="mt-m font-serif text-4xl tracking-tight sm:text-5xl">Courts near you</h2>
            <p className={cn('mt-m max-w-2xl text-base', theme.sectionCopy)}>
              The same marketplace states are shown in every concept so the color roles can be
              compared directly.
            </p>
          </div>

          <div
            aria-label="Access preview"
            className={cn(
              'flex w-fit items-center gap-xxs rounded-full border p-xxs',
              theme.filterShell
            )}
          >
            {['All courts', 'Open Gym', 'Private Rental'].map((filter, index) => (
              <span
                key={filter}
                className={cn(
                  'rounded-full px-l py-s text-xs font-semibold',
                  index === 0 ? theme.filterActive : theme.filterInactive
                )}
              >
                {filter}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3xl grid gap-xl md:grid-cols-2 lg:grid-cols-3">
          {VENUES.map((venue) => (
            <VenueCard key={venue.name} venue={venue} theme={theme} />
          ))}
        </div>
      </section>

      <section
        id="booking-preview"
        className="mx-auto grid max-w-6xl gap-xl px-l pb-6xl sm:px-xl lg:grid-cols-[1.2fr_0.8fr] lg:px-2xl"
      >
        <div className={cn('rounded-[2rem] border p-xl sm:p-2xl', theme.bookingPanel)}>
          <div className="flex flex-col gap-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn('text-xs font-semibold uppercase tracking-[0.18em]', theme.bookingMuted)}>
                Booking decision
              </p>
              <h2 className="mt-s font-serif text-3xl">JEM Community Center</h2>
              <p className={cn('mt-xs text-sm', theme.bookingMuted)}>
                Private full court · Instant booking
              </p>
            </div>
            <span className={cn('w-fit rounded-full border px-l py-s text-sm font-semibold', theme.bookingTime)}>
              Today · 6:00–7:00 PM
            </span>
          </div>

          <div className="mt-2xl flex flex-col gap-m border-t border-current/10 pt-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn('text-xs', theme.bookingMuted)}>Total before fees</p>
              <p className="mt-xxs text-2xl font-semibold">$85.00</p>
            </div>
            <Link
              href="/search"
              className={cn(
                'group inline-flex min-h-12 items-center justify-center gap-l rounded-full px-xl text-sm font-semibold transition-all hover:-translate-y-0.5',
                theme.bookingCta
              )}
            >
              Book this court
              <ArrowIcon className="size-l transition-transform group-hover:translate-x-xs" />
            </Link>
          </div>
        </div>

        <aside className={cn('rounded-[2rem] border p-xl sm:p-2xl', theme.thesisPanel)}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-55">
            Color job description
          </p>
          <p className={cn('mt-m text-sm leading-relaxed', theme.thesisMuted)}>
            Each color has one primary job. This keeps brand expression from weakening status,
            availability, or booking confidence.
          </p>
          <div className="mt-xl space-y-m">
            {theme.swatches.map((swatch) => (
              <div key={swatch.label} className="flex items-center gap-m">
                <span
                  aria-hidden="true"
                  className={cn('size-xl rounded-full border border-current/10', swatch.className)}
                />
                <div>
                  <p className="text-sm font-semibold">{swatch.label}</p>
                  <p className={cn('text-xs', theme.thesisMuted)}>{swatch.role}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer className={cn('border-t', theme.chromeBorder)}>
        <div className="mx-auto flex max-w-6xl flex-col gap-m px-l py-xl text-xs opacity-55 sm:flex-row sm:items-center sm:justify-between sm:px-xl lg:px-2xl">
          <p>PlayBookings brand color study · Concept 0{concept}</p>
          <p>Static prototype · no live booking data</p>
        </div>
      </footer>
    </main>
  )
}
