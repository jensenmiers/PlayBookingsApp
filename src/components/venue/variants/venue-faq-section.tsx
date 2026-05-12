'use client'

import { useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { buildVenueFaqs, type VenueFaq } from '@/lib/venueFaqs'
import type { VenuePlanningPolicy } from '@/lib/venuePlanning'
import type { Venue } from '@/types'

interface VenueFaqSectionProps {
  venue: Venue
  venueAdminConfig?: Partial<VenuePlanningPolicy> | null
  style: 'accordion' | 'tabs' | 'list'
}

export function VenueFaqSection({ venue, venueAdminConfig = null, style }: VenueFaqSectionProps) {
  const faqs = useMemo(() => buildVenueFaqs(venue, venueAdminConfig), [venue, venueAdminConfig])

  if (faqs.length === 0) return null

  return (
    <section>
      <h2 className="font-serif text-xl text-secondary-50 mb-m">
        Frequently Asked Questions
      </h2>

      {style === 'accordion' && <AccordionFaqs faqs={faqs} />}
      {style === 'tabs' && <TabsFaqs faqs={faqs} />}
      {style === 'list' && <ListFaqs faqs={faqs} />}
    </section>
  )
}

function AccordionFaqs({ faqs }: { faqs: VenueFaq[] }) {
  return (
    <div className="space-y-xs">
      {faqs.map((faq, i) => (
        <details
          key={i}
          className="group rounded-xl border border-secondary-50/10 bg-secondary-800/40 overflow-hidden"
        >
          <summary className="flex cursor-pointer items-center justify-between px-l py-m text-secondary-50 font-medium text-sm select-none list-none [&::-webkit-details-marker]:hidden">
            <span>{faq.q}</span>
            <span className="ml-m text-secondary-50/40 text-xs transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="px-l pb-m text-secondary-50/60 text-sm leading-relaxed">
            {faq.a}
          </div>
        </details>
      ))}
    </div>
  )
}

function TabsFaqs({ faqs }: { faqs: VenueFaq[] }) {
  const groups = useMemo(() => {
    const order: VenueFaq['group'][] = ['Booking', 'Space', 'Policies']
    const map = new Map<string, VenueFaq[]>()
    for (const faq of faqs) {
      const existing = map.get(faq.group) || []
      map.set(faq.group, [...existing, faq])
    }
    return order.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }))
  }, [faqs])

  if (groups.length === 0) return null

  return (
    <Tabs defaultValue={groups[0].group}>
      <TabsList className="w-full">
        {groups.map(({ group }) => (
          <TabsTrigger key={group} value={group} className="flex-1 text-sm">
            {group}
          </TabsTrigger>
        ))}
      </TabsList>

      {groups.map(({ group, items }) => (
        <TabsContent key={group} value={group} className="mt-m space-y-m">
          {items.map((faq, i) => (
            <div key={i} className="px-l py-m rounded-xl bg-secondary-800/40 border border-secondary-50/10">
              <div className="text-secondary-50 font-medium text-sm mb-xs">
                {faq.q}
              </div>
              <div className="text-secondary-50/60 text-sm leading-relaxed">
                {faq.a}
              </div>
            </div>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ListFaqs({ faqs }: { faqs: VenueFaq[] }) {
  return (
    <div className="space-y-m">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="rounded-xl bg-secondary-800/40 border border-secondary-50/10 p-l"
        >
          <div className="flex items-start gap-m">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-400/10 text-primary-400 text-xs font-bold">
              Q
            </span>
            <div>
              <div className="text-secondary-50 font-medium text-sm">
                {faq.q}
              </div>
              <div className="text-secondary-50/60 text-sm leading-relaxed mt-xs">
                {faq.a}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
