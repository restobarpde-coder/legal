import type React from "react"

import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/auth"
import { normalizeRole } from "@/lib/authz"
import { DashboardShell } from "@/components/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // getUserProfile authenticates (redirects to /login) and self-heals a
  // missing profile row. Users whose role doesn't map to an internal role
  // (e.g. 'client') have no dashboard access — single choke point for the
  // whole /dashboard tree.
  const profile = await getUserProfile()
  if (normalizeRole(profile?.role) === null) redirect("/login?error=sin-acceso")

  return <DashboardShell>{children}</DashboardShell>
}
