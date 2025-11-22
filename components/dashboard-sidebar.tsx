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
  Mic,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useOptimizedNavigation } from "@/hooks/use-optimized-navigation"
import { useUser } from "@/components/providers/user-context"

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
    name: "AI IMPO",
    href: "/dashboard/chat-webhook",
    icon: MessageSquare,
  },
  {
    name: "Declaraciones",
    href: "/dashboard/declarations",
    icon: Mic,
  },
]



function SidebarContent() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { navigateWithPrefetch, prefetchRoute, isPending, isCurrentRoute } = useOptimizedNavigation()
  const { user } = useUser()

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
      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const isActive = isCurrentRoute(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                onMouseEnter={() => prefetchRoute(item.href)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium transition-all duration-200",
                  "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                  "hover:scale-[1.02] hover:shadow-sm",
                  "relative",
                  isActive && [
                    "bg-sidebar-primary text-sidebar-primary-foreground",
                    "hover:bg-sidebar-primary/90",
                    "shadow-sm",
                    "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                    "before:h-8 before:w-1 before:rounded-r-full before:bg-sidebar-primary-foreground/80"
                  ]
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  "group-hover:scale-110",
                  isActive && "scale-110"
                )} />
                <span className="text-[0.9375rem]">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-sidebar-border p-5">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary shadow-sm">
            <User className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.full_name || 'Usuario'}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{user?.role || 'Cargando...'}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 hover:scale-[1.02]"
          >
            <Settings className="h-4 w-4" />
            <span className="text-[0.9375rem]">Configuración</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2.5 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 hover:scale-[1.02]"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[0.9375rem]">Cerrar Sesión</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

// Mobile sidebar component
export function MobileDashboardSidebar() {
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
        <SidebarContent />
      </SheetContent>
    </Sheet>
  )
}

// Desktop sidebar component
export function DashboardSidebar() {
  return <SidebarContent />
}
