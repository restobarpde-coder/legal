import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      organizations (
        name,
        description
      )
    `)
    .eq("id", data.user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900">Sistema Jurídico</h2>
          <p className="text-sm text-gray-600">{profile?.organizations?.name}</p>
        </div>
        <nav className="mt-6">
          <div className="px-3">
            <div className="space-y-1">
              <a
                href="/dashboard"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Dashboard
              </a>
              <a
                href="/dashboard/clients"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Clientes
              </a>
              <a
                href="/dashboard/matters"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Casos
              </a>
              <a
                href="/dashboard/tasks"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Tareas
              </a>
              <a
                href="/dashboard/calendar"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Calendario
              </a>
              <a
                href="/dashboard/documents"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Documentos
              </a>
              {profile?.role === "admin" && (
                <a
                  href="/dashboard/admin"
                  className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                >
                  Administración
                </a>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
