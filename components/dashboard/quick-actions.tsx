"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, Calendar, Clock, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      title: "Add New Client",
      description: "Create a new client profile",
      icon: Users,
      href: "/dashboard/clients/new",
      color: "text-blue-600",
    },
    {
      title: "Create New Matter",
      description: "Start a new legal matter",
      icon: FileText,
      href: "/dashboard/matters/new",
      color: "text-green-600",
    },
    {
      title: "Schedule Event",
      description: "Add calendar appointment",
      icon: Calendar,
      href: "/dashboard/calendar/new",
      color: "text-purple-600",
    },
    {
      title: "Log Time Entry",
      description: "Record billable hours",
      icon: Clock,
      href: "/dashboard/time-tracking/new",
      color: "text-orange-600",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks to get you started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.title}
            variant="outline"
            className="w-full justify-start h-auto p-4 bg-transparent"
            onClick={() => router.push(action.href)}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                <action.icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
              <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
