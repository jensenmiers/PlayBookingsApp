'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatTime } from '@/utils/dateHelpers'
import type { Venue } from '@/types'
import {
  useRequestToBookForm,
  type RequestToBookPolicy,
} from './request-to-book/use-request-to-book-form'
import {
  RequestDetailsFields,
  RequestFormError,
  RequestPriceSummary,
  RequestSuccess,
  RequestTimeFields,
  formatRequestDate,
} from './request-to-book/request-form-parts'

export type { RequestToBookPolicy }
export { REQUEST_ACTIVITY_OPTIONS } from './request-to-book/use-request-to-book-form'

const DESKTOP_QUERY = '(min-width: 768px)'

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia(DESKTOP_QUERY).matches
}

/**
 * Venue page card for request-to-book venues, PeerSpace-style: pick a date and times,
 * see the estimate, then "Request a time". Phones finish in a bottom sheet; desktop
 * moves to the full request page with the chosen times.
 */
export function RequestToBookPanel({
  venue,
  venueAdminConfig = null,
}: {
  venue: Venue
  venueAdminConfig?: RequestToBookPolicy | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  // A renter who signed in from the sheet comes back to it, filled in.
  const reopenSheetOnPhone = useCallback(() => {
    if (!isDesktopViewport()) setSheetOpen(true)
  }, [setSheetOpen])

  const form = useRequestToBookForm({ venue, venueAdminConfig, onResumed: reopenSheetOnPhone })

  const handleRequestTime = () => {
    if (!form.checkTime()) return

    if (isDesktopViewport()) {
      const params = new URLSearchParams({ date: form.date, start: form.startTime, end: form.endTime })
      router.push(`${pathname}/request?${params.toString()}`)
      return
    }
    setSheetOpen(true)
  }

  return (
    <div className="p-xl">
      <div className="min-w-0 space-y-s">
        <p className="break-words font-serif text-2xl text-secondary-50">Request your preferred time</p>
        <p className="text-sm text-secondary-50/60">
          You won&apos;t be charged. The venue confirms by email, usually within 24 hours.
        </p>
      </div>

      <div className="mt-l min-w-0 space-y-l">
        <RequestTimeFields form={form} />
        <RequestPriceSummary form={form} hourlyRate={venue.hourly_rate} />
        {!sheetOpen ? <RequestFormError message={form.error} /> : null}
        <Button type="button" className="w-full" onClick={handleRequestTime}>
          Request a time
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
          {form.submitted ? (
            <div className="p-xl">
              <SheetTitle className="sr-only">Request sent</SheetTitle>
              <RequestSuccess form={form} />
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Request to book</SheetTitle>
                <SheetDescription>
                  {formatRequestDate(form.date)} · {formatTime(form.startTime)} – {formatTime(form.endTime)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-l px-xl pb-xl pt-l">
                <RequestDetailsFields form={form} />
                <RequestPriceSummary form={form} hourlyRate={venue.hourly_rate} />
                <RequestFormError message={form.error} />
                <Button type="button" className="w-full" onClick={() => void form.submit()} disabled={form.sending}>
                  {form.sending ? 'Sending...' : 'Send request'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
