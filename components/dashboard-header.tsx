'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileDashboardSidebar } from "./dashboard-sidebar"
import { NotificationDropdown } from "./notification-dropdown"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useUser } from "@/components/providers/user-context"

interface DashboardHeaderProps {
  title?: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useUser()

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      router.push(`/dashboard/search?q=${searchQuery}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        {/* Mobile menu button */}
        <MobileDashboardSidebar />

        {/* Page title */}
        {title && <h1 className="text-lg font-semibold md:text-xl">{title}</h1>}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-9 w-48 lg:w-64 xl:w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Notifications */}
        <NotificationDropdown />
      </div>
    </header>
  )
}