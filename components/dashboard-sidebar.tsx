"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Scale,
  LayoutDashboard,
  Users,
  CheckSquare,
  FolderOpen,
  Clock,
  Settings,
  LogOut,
  Menu,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useOptimizedNavigation } from "@/hooks/use-optimized-navigation"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Casos",
    href: "/dashboard/cases",
    icon: Scale,
  },
  {
    name: "Clientes",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    name: "Calendario",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    name: "Tareas",
    href: "/dashboard/tasks",
    icon: CheckSquare,
  },
  {
    name: "Documentos",
    href: "/dashboard/documents",
    icon: FolderOpen,
  },
  {
    name: "Tiempo",
    href: "/dashboard/time",
    icon: Clock,
  },
  {
    name: "Chatwoot",
    href: "/dashboard/chatwoot",
    icon: MessageSquare,
  },
]

interface DashboardSidebarProps {
  user: {
    full_name: string
    email: string
    role: string
  }
}

function SidebarContent({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { navigateWithPrefetch, prefetchRoute, isPending, isCurrentRoute } = useOptimizedNavigation()
  
  // Prefetch functions for different routes
  const prefetchData = {
    '/dashboard/cases': () => {
      queryClient.prefetchQuery({
        queryKey: ['cases'],
        queryFn: () => fetch('/api/cases').then(res => res.json()),
        staleTime: 1000 * 60 * 5, // 5min
      })
    },
    '/dashboard/clients': () => {
      queryClient.prefetchQuery({
        queryKey: ['clients'],
        queryFn: () => fetch('/api/clients').then(res => res.json()),
        staleTime: 1000 * 60 * 5,
      })
    },
    '/dashboard/tasks': () => {
      queryClient.prefetchQuery({
        queryKey: ['tasks'],
        queryFn: () => fetch('/api/tasks').then(res => res.json()),
        staleTime: 1000 * 60 * 5,
      })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-6">
        <span className="text-2xl font-bold text-sidebar-foreground">CA</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = isCurrentRoute(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onMouseEnter={() => prefetchRoute(item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-75",
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary">
            <User className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.full_name}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{user.role}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-75"
          >
            <Settings className="h-4 w-4" />
            Configuración
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

// Mobile sidebar component
export function MobileDashboardSidebar({ user }: DashboardSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <SidebarContent user={user} />
      </SheetContent>
    </Sheet>
  )
}

// Desktop sidebar component
export function DashboardSidebar({ user }: DashboardSidebarProps) {
  return <SidebarContent user={user} />
}
