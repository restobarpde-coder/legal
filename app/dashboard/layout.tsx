import type React from "react"

import { requireAuth, getUserProfile } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  const profile = await getUserProfile()

  if (!profile) {
    return <div>Error loading profile</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <DashboardSidebar user={profile} />
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        <DashboardHeader user={profile} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
