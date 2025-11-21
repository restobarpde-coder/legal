import type React from "react"

import { requireAuth } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Only check auth - don't fetch profile (moved to client-side)
  await requireAuth()

  return <DashboardShell>{children}</DashboardShell>
}
