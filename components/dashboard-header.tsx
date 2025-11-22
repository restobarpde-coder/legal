'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MobileDashboardSidebar } from "./dashboard-sidebar"
import { NotificationDropdown } from "./notification-dropdown"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useUser } from "@/components/providers/user-context"
import { useDebouncedCallback } from "use-debounce"

interface DashboardHeaderProps {
  title?: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const { user } = useUser()

  // Sync search query with URL params when they change (e.g. navigation)
  useEffect(() => {
    if (pathname === '/dashboard/search') {
      setSearchQuery(searchParams.get('q') || '')
    }
  }, [searchParams, pathname])

  const debouncedSearch = useDebouncedCallback((term: string) => {
    if (pathname === '/dashboard/search') {
      const params = new URLSearchParams(searchParams.toString())
      if (term) {
        params.set('q', term)
      } else {
        params.delete('q')
      }
      router.replace(`/dashboard/search?${params.toString()}`)
    }
  }, 500)

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      router.push(`/dashboard/search?q=${searchQuery}`)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    debouncedSearch(value)
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="flex h-18 items-center gap-4 px-4 md:px-6">
        {/* Mobile menu button */}
        <MobileDashboardSidebar />

        {/* Page title */}
        {title && <h1 className="text-lg font-semibold md:text-xl lg:text-2xl">{title}</h1>}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
          <Input
            placeholder="Buscar..."
            className="pl-10 w-56 lg:w-72 xl:w-96 h-11 rounded-lg border-input bg-background/50 backdrop-blur-sm transition-all duration-200 focus:w-80 lg:focus:w-80 xl:focus:w-[28rem] focus:shadow-md"
            value={searchQuery}
            onChange={handleChange}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Theme Toggle */}
        <ModeToggle />

        {/* Notifications */}
        <NotificationDropdown />
      </div>
    </header>
  )
}