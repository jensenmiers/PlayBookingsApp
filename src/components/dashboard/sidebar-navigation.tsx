"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowRightFromBracket,
  faCalendarDays,
  faChartLine,
  faGear,
  faListUl,
  faComments,
  faMoneyBillTransfer,
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
  { label: "Bookings", href: "/bookings", icon: faCalendarDays },
  { label: "Payouts", href: "/payouts", icon: faMoneyBillTransfer },
  { label: "Listings", href: "/listings", icon: faListUl },
  { label: "Messages", href: "/messages", icon: faComments, badge: "3" },
  { label: "Settings", href: "/settings", icon: faGear },
]

export function SidebarNavigation({
  items = DEFAULT_ITEMS,
  user,
  onSignOut,
}: SidebarNavigationProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-72 flex-none border-r border-border/40 bg-white/95 px-6 py-8 shadow-soft lg:block">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-lg font-semibold">PB</span>
        </div>
        <span className="text-xl font-bold text-primary-800">PlayBookings</span>
      </div>

      <nav className="mt-10 flex flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname?.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-800"
                  : "text-muted-foreground hover:bg-primary-50 hover:text-primary-700"
              )}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={cn(
                  "size-4",
                  isActive ? "text-primary-600" : "text-muted-foreground"
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

      <div className="mt-auto border-t border-border/40 pt-6">
        {user && (
          <div className="mb-4 flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-full bg-primary-200">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <span className="grid size-full place-items-center text-sm font-semibold uppercase text-primary-700">
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-800">{user.name}</p>
              {user.role && (
                <p className="text-xs text-muted-foreground">{user.role}</p>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={onSignOut}
          variant="outline"
          className="w-full justify-center gap-2 rounded-xl border-border/60 bg-primary-50 text-primary-700 hover:bg-primary-100"
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="size-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  )
}
