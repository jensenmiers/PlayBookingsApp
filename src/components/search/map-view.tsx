'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMap } from '@fortawesome/free-solid-svg-icons'

export function MapView() {
  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="bg-primary-200 rounded-full p-6">
            <FontAwesomeIcon icon={faMap} className="text-4xl text-primary-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-primary-800 mb-3">Map View Coming Soon</h2>
        <p className="text-primary-600 mb-6">
          We&apos;re working on bringing you an interactive map view to help you discover venues near you.
        </p>
        <div className="bg-white rounded-2xl shadow-soft p-6 text-left">
          <h3 className="font-semibold text-primary-800 mb-2">Planned Features:</h3>
          <ul className="space-y-2 text-primary-600 text-sm">
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">•</span>
              <span>Interactive map with venue locations</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">•</span>
              <span>Real-time availability indicators</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">•</span>
              <span>Distance and route information</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">•</span>
              <span>Filter venues by location</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

