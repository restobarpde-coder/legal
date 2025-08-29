import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Calendar, Clock, TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardsProps {
  stats: {
    activeClients: number
    openMatters: number
    upcomingEvents: number
    hoursThisMonth: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Active Clients",
      value: stats.activeClients,
      icon: Users,
      description: stats.activeClients === 0 ? "No clients yet" : `${stats.activeClients} active clients`,
      trend: stats.activeClients > 0 ? "up" : null,
    },
    {
      title: "Open Matters",
      value: stats.openMatters,
      icon: FileText,
      description: stats.openMatters === 0 ? "No matters yet" : `${stats.openMatters} open matters`,
      trend: stats.openMatters > 0 ? "up" : null,
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      icon: Calendar,
      description: stats.upcomingEvents === 0 ? "No events scheduled" : "Next 7 days",
      trend: null,
    },
    {
      title: "Hours This Month",
      value: stats.hoursThisMonth.toFixed(1),
      icon: Clock,
      description: stats.hoursThisMonth === 0 ? "No time entries yet" : "Billable hours",
      trend: stats.hoursThisMonth > 0 ? "up" : null,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className="flex items-center gap-2">
              {card.trend &&
                (card.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                ))}
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
