'use client'

import type React from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { UserProvider } from "@/components/providers/user-context"

export function DashboardShell({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <div className="min-h-screen bg-background overflow-x-hidden">
                {/* Desktop sidebar */}
                <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
                    <DashboardSidebar />
                </div>

                {/* Main content */}
                <div className="lg:pl-64 overflow-x-hidden">
                    <DashboardHeader />
                    <main className="p-2 sm:p-3 md:p-4 lg:p-5 max-w-full overflow-x-hidden">{children}</main>
                </div>
            </div>
        </UserProvider>
    )
}
