"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Settings, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"

interface HeaderProps {
  user: {
    id: string
    email?: string
  }
  profile?: {
    first_name?: string
    last_name?: string
    avatar_url?: string
    role?: string
  } | null
}

export function Header({ user, profile }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
      }
      
      // Clear any local storage or session data
      if (typeof window !== 'undefined') {
        // Clear any cached data
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Force redirect to login page
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Unexpected logout error:', error)
      // Force redirect even if there's an error
      window.location.href = '/auth/login'
    }
  }

  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : user.email

  const initials =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`
      : user.email?.[0]?.toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <Sidebar />

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                {profile?.role && (
                  <p className="text-xs leading-none text-muted-foreground capitalize">{profile.role}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="/dashboard/settings">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </a>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </a>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
