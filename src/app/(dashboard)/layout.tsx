'use client'

import type { ReactNode } from 'react'

import { SidebarNavigation } from '@/components/dashboard/sidebar-navigation'

const placeholderUser = {
  name: 'Michael Johnson',
  isRenter: false,
  isVenueOwner: true,
  isAdmin: false,
  avatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg',
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-primary-50">
      <SidebarNavigation user={placeholderUser} />
      <main className="flex-1 overflow-y-auto bg-primary-50 px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-10">{children}</div>
      </main>
    </div>
  )
}
