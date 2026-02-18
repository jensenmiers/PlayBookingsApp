"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowRightFromBracket,
  faCalendarDays,
  faChartLine,
  faBuilding,
  faMoneyBillTransfer,
  faClipboardList,
  faGear,
} from "@fortawesome/free-solid-svg-icons"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SidebarNavItem = {
  label: string
  href: string
  icon: IconDefinition
  badge?: string
}

export type SidebarUser = {
  name: string
  role?: string
  avatarUrl?: string
}

export type SidebarNavigationProps = {
  items?: SidebarNavItem[]
  user?: SidebarUser
  onSignOut?: () => void
}

const DEFAULT_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: faChartLine },
  { label: "My Venues", href: "/listings", icon: faBuilding },
  { label: "Incoming Bookings", href: "/my-bookings", icon: faClipboardList },
  { label: "Availability", href: "/calendar", icon: faCalendarDays },
  { label: "Payouts", href: "/payouts", icon: faMoneyBillTransfer },
  { label: "Settings", href: "/settings", icon: faGear },
]

export function SidebarNavigation({
  items = DEFAULT_ITEMS,
  user,
  onSignOut,
}: SidebarNavigationProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-[calc(100vh-4rem)] w-72 flex-none border-r border-secondary-50/10 bg-secondary-900 px-6 py-8 shadow-soft lg:block">
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname?.startsWith(item.href)

          return (
              <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary-50/10 text-secondary-50"
                  : "text-secondary-50/50 hover:bg-secondary-50/5 hover:text-secondary-50/80"
              )}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={cn(
                  "size-4",
                  isActive ? "text-secondary-50" : "text-secondary-50/50"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-secondary-50/10 pt-6">
        {user && (
          <div className="mb-4 flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-full bg-secondary-700">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <span className="grid size-full place-items-center text-sm font-semibold uppercase text-secondary-50/70">
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-secondary-50">{user.name}</p>
              {user.role && (
                <p className="text-xs text-secondary-50/50">{user.role}</p>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={onSignOut}
          variant="outline"
          className="w-full justify-center gap-2 rounded-xl border-secondary-50/10 bg-secondary-50/10 text-secondary-50/70 hover:bg-secondary-50/20"
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="size-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  )
}
