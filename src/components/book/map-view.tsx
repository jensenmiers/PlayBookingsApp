'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMap } from '@fortawesome/free-solid-svg-icons'

export function MapView() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-l">
      <div className="text-center max-w-md">
        <div className="mb-xl flex justify-center">
          <div className="bg-secondary-50/10 rounded-full p-xl">
            <FontAwesomeIcon icon={faMap} className="text-4xl text-secondary-50/60" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-secondary-50 mb-m">Map View Coming Soon</h2>
        <p className="text-secondary-50/60 mb-xl">
          We&apos;re working on bringing you an interactive map view to help you discover venues near you.
        </p>
        <div className="bg-secondary-800 rounded-2xl shadow-soft p-xl text-left">
          <h3 className="font-semibold text-secondary-50 mb-s">Planned Features:</h3>
          <ul className="space-y-2 text-secondary-50/60 text-sm">
            <li className="flex items-start">
              <span className="text-secondary-50/50 mr-s">•</span>
              <span>Interactive map with venue locations</span>
            </li>
            <li className="flex items-start">
              <span className="text-secondary-50/50 mr-s">•</span>
              <span>Real-time availability indicators</span>
            </li>
            <li className="flex items-start">
              <span className="text-secondary-50/50 mr-s">•</span>
              <span>Distance and route information</span>
            </li>
            <li className="flex items-start">
              <span className="text-secondary-50/50 mr-s">•</span>
              <span>Filter venues by location</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

