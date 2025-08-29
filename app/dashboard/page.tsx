import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/get-profile"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const profile = await getProfile()

  // Get dashboard stats
  const [clientsResult, mattersResult, eventsResult, timeEntriesResult] = await Promise.all([
    supabase.from("clients").select("id").eq("status", "active"),
    supabase.from("matters").select("id").eq("status", "open"),
    supabase
      .from("calendar_events")
      .select("id")
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("time_entries")
      .select("hours")
      .gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0])
      .eq("user_id", data.user.id),
  ])

  const stats = {
    activeClients: clientsResult.data?.length || 0,
    openMatters: mattersResult.data?.length || 0,
    upcomingEvents: eventsResult.data?.length || 0,
    hoursThisMonth: timeEntriesResult.data?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0,
  }

  // Mock recent activity for now - in a real app, this would come from an activity log
  const recentActivities = []

  return (
    <DashboardLayout user={data.user} profile={profile}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {profile?.first_name || data.user.email}. Here's what's happening with your practice.
          </p>
        </div>

        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity activities={recentActivities} />
          <QuickActions />
        </div>
      </div>
    </DashboardLayout>
  )
}
