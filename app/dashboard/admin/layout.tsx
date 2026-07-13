import type React from "react"
import { requirePageRole } from "@/lib/authz-server"

// Everything under /dashboard/admin is admin-only.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePageRole("admin")
  return <>{children}</>
}
