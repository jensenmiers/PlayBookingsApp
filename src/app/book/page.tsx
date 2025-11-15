import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Navigation } from '@/components/layout/navigation'

export default function BookPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
      <Navigation />
      
      {/* Hero / Search Section */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-primary-900 md:text-5xl">
              Find Your Perfect{' '}
              <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                Court
              </span>
            </h1>
            <p className="mt-4 text-lg text-primary-600">
              Discover and book indoor basketball courts in your area
            </p>
          </div>

          {/* Search Bar Placeholder */}
          <Card className="border-border/60 bg-white/95 shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Search by location, venue name, or address..."
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Date"
                    className="w-full md:w-auto"
                  />
                  <Input
                    type="time"
                    placeholder="Time"
                    className="w-full md:w-auto"
                  />
                  <Button className="rounded-xl bg-secondary-600 px-8 hover:bg-secondary-700">
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters Placeholder */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              All Venues
            </Button>
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              Price Range
            </Button>
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              Availability
            </Button>
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              Amenities
            </Button>
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              Distance
            </Button>
          </div>
        </div>
      </section>

      {/* Results Section Placeholder */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-primary-900">
              Available Courts
            </h2>
            <div className="text-sm text-primary-600">
              {/* Results count placeholder */}
              Showing results...
            </div>
          </div>

          {/* Booking Cards Placeholder */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Card key={item} className="border-border/60 bg-white/95 shadow-soft transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-4 h-48 w-full rounded-lg bg-gradient-to-br from-primary-200 to-secondary-200" />
                  <CardTitle className="text-xl text-primary-900">Venue Name Placeholder</CardTitle>
                  <CardDescription className="text-primary-600">
                    Location Placeholder • Distance Placeholder
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary-600">Price per hour</span>
                      <span className="font-semibold text-primary-900">$XX.XX</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary-600">Availability</span>
                      <span className="text-primary-900">Available</span>
                    </div>
                    <div className="pt-4">
                      <Button className="w-full rounded-xl bg-secondary-600 hover:bg-secondary-700">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Placeholder */}
          <div className="mt-8 flex justify-center gap-2">
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              Previous
            </Button>
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              1
            </Button>
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              2
            </Button>
            <Button variant="outline" className="rounded-xl border-primary-200 bg-white/80 text-primary-700 hover:bg-primary-100">
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

