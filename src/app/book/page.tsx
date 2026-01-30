'use client'

import { Navigation } from '@/components/layout/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { VenuesView } from '@/components/book/venues-view'
import { CalendarView } from '@/components/book/calendar-view'
import { MapView } from '@/components/book/map-view'

export default function BookPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-secondary-50/70 to-primary-50">
      <Navigation />

      {/* Segmented Control / Tab Switcher */}
      <section className="px-4 pt-6 pb-4">
        <div className="mx-auto max-w-6xl">
          <Tabs defaultValue="venues" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-secondary-100 p-1 rounded-xl h-12 border border-secondary-200 shadow-soft">
              <TabsTrigger
                value="venues"
                className="rounded-lg border-2 border-transparent data-[state=active]:bg-white data-[state=active]:text-secondary-900 data-[state=active]:font-semibold data-[state=active]:border-secondary-300 data-[state=active]:shadow-md transition-all duration-200 text-secondary-600 hover:text-secondary-800"
              >
                Venues
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="rounded-lg border-2 border-transparent data-[state=active]:bg-white data-[state=active]:text-secondary-900 data-[state=active]:font-semibold data-[state=active]:border-secondary-300 data-[state=active]:shadow-md transition-all duration-200 text-secondary-600 hover:text-secondary-800"
              >
                Calendar
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="rounded-lg border-2 border-transparent data-[state=active]:bg-white data-[state=active]:text-secondary-900 data-[state=active]:font-semibold data-[state=active]:border-secondary-300 data-[state=active]:shadow-md transition-all duration-200 text-secondary-600 hover:text-secondary-800"
              >
                Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="venues" className="mt-4">
              <VenuesView />
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
