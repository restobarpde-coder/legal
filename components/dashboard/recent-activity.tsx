import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { FileText, Users, Calendar, Clock } from "lucide-react"

interface Activity {
  id: string
  type: "client" | "matter" | "event" | "time_entry"
  title: string
  description: string
  timestamp: string
  status?: string
}

interface RecentActivityProps {
  activities: Activity[]
}

const activityIcons = {
  client: Users,
  matter: FileText,
  event: Calendar,
  time_entry: Clock,
}

const activityColors = {
  client: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  matter: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  event: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  time_entry: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type]
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${activityColors[activity.type]}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{activity.title}</p>
                    {activity.status && (
                      <Badge variant="secondary" className="text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
