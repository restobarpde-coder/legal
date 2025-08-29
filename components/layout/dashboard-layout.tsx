import type { ReactNode } from "react"
import { Header } from "./header"

interface DashboardLayoutProps {
  children: ReactNode
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

export function DashboardLayout({ children, user, profile }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />
      <div className="flex">
        <div className="hidden lg:block lg:w-64 lg:flex-shrink-0" />
        <main className="flex-1 lg:pl-0">
          <div className="px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
