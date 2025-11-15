'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faCalendarDays,
  faClock,
  faSliders,
  faChevronDown,
  faStar,
  faLocationDot,
  faDollarSign,
} from '@fortawesome/free-solid-svg-icons'
import { faClock as faClockRegular } from '@fortawesome/free-regular-svg-icons'

// Mock data - will be replaced with API data later
const featuredCourts = [
  {
    id: 1,
    name: 'Downtown Court',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/6c21859434-7a91768137c57282a2dc.png',
    badge: { text: 'Featured', color: 'accent' },
    price: 45,
    rating: 4.9,
    distance: '2.3 miles away',
    availability: 'Available 8AM - 10PM',
  },
  {
    id: 2,
    name: 'Riverside Gym',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/18e5a0f8c5-200092e4588618c5e022.png',
    badge: { text: 'Pro Court', color: 'secondary' },
    price: 65,
    rating: 4.8,
    distance: '3.7 miles away',
    availability: 'Available 6AM - 11PM',
  },
  {
    id: 3,
    name: 'Parkside Courts',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/b940e2d8f5-915485541597535f71c2.png',
    badge: { text: 'Featured', color: 'accent' },
    price: 35,
    rating: 4.7,
    distance: '1.5 miles away',
    availability: 'Available 7AM - 9PM',
  },
]

const nearbyCourts = [
  {
    id: 1,
    name: 'Community Center',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/4c98a71eaa-995723f8d928f44a5776.png',
    rating: 4.5,
    distance: '0.8 miles away',
    price: 30,
    amenities: ['Indoor', 'Locker Room'],
  },
  {
    id: 2,
    name: 'Lincoln Park Courts',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/a1ee9a2943-f8f342ab4732e1437b92.png',
    rating: 4.3,
    distance: '1.2 miles away',
    price: 25,
    amenities: ['Outdoor', 'Lights'],
  },
  {
    id: 3,
    name: 'University Gym',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/d4976ba121-539c8e8894da16d4664a.png',
    rating: 4.9,
    distance: '2.5 miles away',
    price: 55,
    amenities: ['Indoor', 'Pro Quality'],
  },
]

const recentlyViewed = [
  {
    id: 1,
    name: 'Elite Sports Arena',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/c42af518cb-42e7507c0159a36618cc.png',
    price: 70,
    distance: '4.1 miles away',
  },
  {
    id: 2,
    name: 'Westside Rec Center',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/2edf2cf3cc-e846f2f6fe104498ef16.png',
    price: 40,
    distance: '3.2 miles away',
  },
  {
    id: 3,
    name: 'Neighborhood Court',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/90412b9be5-386a140f47a5629af618.png',
    price: 25,
    distance: '1.8 miles away',
  },
]

export function VenuesView() {
  return (
    <div className="min-h-screen bg-primary-50">
      {/* Search and Filter Section */}
      <section className="px-4 pt-6 pb-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-primary-800 mb-2">Find a Court</h2>
          <p className="text-primary-600">Discover nearby basketball courts for your next game</p>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-primary-300" />
          </div>
          <Input
            type="text"
            placeholder="Search by location or gym name"
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-soft"
          />
        </div>

        <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-white rounded-xl px-4 py-3 shadow-soft text-primary-700 hover:bg-primary-50">
              <FontAwesomeIcon icon={faCalendarDays} className="text-primary-600" />
              <span className="whitespace-nowrap">May 26, 2023</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-1" />
            </Button>
          </div>
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-white rounded-xl px-4 py-3 shadow-soft text-primary-700 hover:bg-primary-50">
              <FontAwesomeIcon icon={faClock} className="text-primary-600" />
              <span className="whitespace-nowrap">7:00 PM</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-1" />
            </Button>
          </div>
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-white rounded-xl px-4 py-3 shadow-soft text-primary-700 hover:bg-primary-50">
              <FontAwesomeIcon icon={faSliders} className="text-primary-600" />
              <span className="whitespace-nowrap">Filters</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Courts Section */}
      <section className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary-800">Featured Courts</h3>
          <span className="text-secondary-600 font-medium text-sm cursor-pointer hover:text-secondary-700">
            View All
          </span>
        </div>

        <div className="flex overflow-x-auto space-x-4 pb-4">
          {featuredCourts.map((court) => (
            <div
              key={court.id}
              className="flex-shrink-0 w-[280px] bg-white rounded-2xl shadow-soft overflow-hidden"
            >
              <div className="relative h-[160px]">
                <img
                  className="w-full h-full object-cover"
                  src={court.image}
                  alt={`${court.name} basketball court`}
                />
                <div
                  className={`absolute top-3 left-3 ${
                    court.badge.color === 'accent' ? 'bg-accent-500' : 'bg-secondary-500'
                  } text-white text-xs font-bold px-3 py-1 rounded-full`}
                >
                  {court.badge.text}
                </div>
                <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 rounded-lg px-2 py-1 text-xs font-medium text-primary-800">
                  ${court.price}/hour
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-primary-800">{court.name}</h4>
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-xs mr-1" />
                    <span className="text-sm font-medium">{court.rating}</span>
                  </div>
                </div>
                <div className="flex items-center text-primary-600 text-sm mb-2">
                  <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-primary-500" />
                  <span>{court.distance}</span>
                </div>
                <div className="flex items-center text-primary-600 text-sm mb-3">
                  <FontAwesomeIcon icon={faClockRegular} className="mr-2 text-primary-500" />
                  <span>{court.availability}</span>
                </div>
                <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition duration-200">
                  Book Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nearby Courts Section */}
      <section className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary-800">Nearby Courts</h3>
          <span className="text-secondary-600 font-medium text-sm cursor-pointer hover:text-secondary-700">
            View Map
          </span>
        </div>

        <div className="space-y-4">
          {nearbyCourts.map((court) => (
            <div key={court.id} className="bg-white rounded-2xl shadow-soft overflow-hidden">
              <div className="flex">
                <div className="w-1/3 h-[120px]">
                  <img
                    className="w-full h-full object-cover"
                    src={court.image}
                    alt={`${court.name} basketball court`}
                  />
                </div>
                <div className="w-2/3 p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-primary-800">{court.name}</h4>
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-xs mr-1" />
                      <span className="text-sm font-medium">{court.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-primary-600 text-sm mb-1">
                    <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-primary-500" />
                    <span>{court.distance}</span>
                  </div>
                  <div className="flex items-center text-primary-600 text-sm mb-2">
                    <FontAwesomeIcon icon={faDollarSign} className="mr-2 text-primary-500" />
                    <span>${court.price}/hour</span>
                  </div>
                  <div className="flex space-x-2">
                    {court.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full mt-4 bg-white border border-primary-300 text-primary-700 font-medium py-3 rounded-xl hover:bg-primary-50 transition duration-200">
          Load More Courts
        </Button>
      </section>

      {/* Recently Viewed Section */}
      <section className="px-4 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary-800">Recently Viewed</h3>
          <span className="text-secondary-600 font-medium text-sm cursor-pointer hover:text-secondary-700">
            Clear All
          </span>
        </div>

        <div className="flex overflow-x-auto space-x-4 pb-4">
          {recentlyViewed.map((court) => (
            <div
              key={court.id}
              className="flex-shrink-0 w-[220px] bg-white rounded-2xl shadow-soft overflow-hidden"
            >
              <div className="relative h-[120px]">
                <img
                  className="w-full h-full object-cover"
                  src={court.image}
                  alt={`${court.name} basketball court`}
                />
                <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 rounded-lg px-2 py-1 text-xs font-medium text-primary-800">
                  ${court.price}/hour
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-bold text-primary-800 mb-1">{court.name}</h4>
                <div className="flex items-center text-primary-600 text-xs mb-2">
                  <FontAwesomeIcon icon={faLocationDot} className="mr-1 text-primary-500" />
                  <span>{court.distance}</span>
                </div>
                <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 text-sm rounded-xl transition duration-200">
                  Book Again
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

