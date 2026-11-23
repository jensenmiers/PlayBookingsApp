'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Venue } from '@/types'
import {
  useRequestToBookForm,
  type RequestTimeValues,
  type RequestToBookPolicy,
} from './use-request-to-book-form'
import {
  RequestDetailsFields,
  RequestFormError,
  RequestPriceSummary,
  RequestSuccess,
  RequestTimeFields,
} from './request-form-parts'

/** Desktop "Request to book" page, PeerSpace-style: the form on the left, the venue and estimate on the right. */
export function RequestToBookPage({
  venue,
  venueSlug,
  venueAdminConfig = null,
  initial,
}: {
  venue: Venue
  venueSlug: string
  venueAdminConfig?: RequestToBookPolicy | null
  initial?: Partial<RequestTimeValues>
}) {
  const form = useRequestToBookForm({ venue, venueAdminConfig, initial })
  const photo = venue.photos?.[0]

  return (
    <div className="mx-auto grid max-w-6xl gap-2xl px-l py-2xl md:grid-cols-[minmax(0,1fr)_22rem] md:px-xl">
      <div className="min-w-0">
        {form.submitted ? (
          <RequestSuccess form={form} />
        ) : (
          <div className="space-y-xl">
            <div className="space-y-xs">
              <h1 className="font-serif text-3xl text-secondary-50 sm:text-4xl">Request to book</h1>
              <p className="text-sm text-secondary-50/60">
                You won&apos;t be charged. The venue confirms by email, usually within 24 hours.
              </p>
            </div>

            <section className="space-y-l">
              <h2 className="text-lg font-semibold text-secondary-50">Your event</h2>
              <RequestTimeFields form={form} />
              <RequestDetailsFields form={form} />
            </section>

            <RequestFormError message={form.error} />
            <Button type="button" className="w-full sm:w-auto sm:min-w-[16rem]" onClick={() => void form.submit()} disabled={form.sending}>
              {form.sending ? 'Sending...' : 'Send request'}
            </Button>
          </div>
        )}
      </div>

      <aside className="min-w-0 space-y-m md:sticky md:top-l md:self-start">
        <Link
          href={`/venue/${venueSlug}`}
          className="flex gap-m rounded-2xl border border-secondary-50/10 bg-secondary-800/80 p-m transition-colors hover:border-secondary-50/20"
        >
          <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-700">
            {photo ? <Image src={photo} alt={venue.name} fill className="object-cover" sizes="96px" /> : null}
          </div>
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight text-secondary-50">{venue.name}</p>
            <p className="mt-xxs text-sm text-secondary-50/60">{venue.city}, {venue.state}</p>
          </div>
        </Link>
        <RequestPriceSummary form={form} hourlyRate={venue.hourly_rate} />
      </aside>
    </div>
  )
}
