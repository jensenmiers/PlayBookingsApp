'use client'

import { Navigation } from '@/components/layout/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AvailabilityView } from '@/components/search/availability-view'
import { CalendarView } from '@/components/search/calendar-view'
import { MapView } from '@/components/search/map-view'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
      <Navigation />

      {/* Segmented Control / Tab Switcher */}
      <section className="px-4 pt-6 pb-4">
        <div className="mx-auto max-w-6xl">
          <Tabs defaultValue="availability" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-primary-100 p-1 rounded-xl h-12 border border-primary-200 shadow-soft">
              <TabsTrigger
                value="availability"
                className="rounded-lg border-2 border-transparent data-[state=active]:bg-white data-[state=active]:text-primary-900 data-[state=active]:font-semibold data-[state=active]:border-primary-300 data-[state=active]:shadow-md transition-all duration-200 text-primary-600 hover:text-primary-800"
              >
                Classes
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="rounded-lg border-2 border-transparent data-[state=active]:bg-white data-[state=active]:text-primary-900 data-[state=active]:font-semibold data-[state=active]:border-primary-300 data-[state=active]:shadow-md transition-all duration-200 text-primary-600 hover:text-primary-800"
              >
                Calendar
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="rounded-lg border-2 border-transparent data-[state=active]:bg-white data-[state=active]:text-primary-900 data-[state=active]:font-semibold data-[state=active]:border-primary-300 data-[state=active]:shadow-md transition-all duration-200 text-primary-600 hover:text-primary-800"
              >
                Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="availability" className="mt-4">
              <AvailabilityView />
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <CalendarView />
            </TabsContent>

            <TabsContent value="map" className="mt-4">
              <MapView />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}

