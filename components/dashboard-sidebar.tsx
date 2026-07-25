"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
  Bot,
  ShieldCheck,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useOptimizedNavigation } from "@/hooks/use-optimized-navigation"
import { useUser } from "@/components/providers/user-context"
import { hasRole, ROLE_LABELS, type EffectiveRole } from "@/lib/authz"

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutDashboard
  description?: string
  minRole?: EffectiveRole
}

type NavSection = {
  /** Sin label la sección se dibuja sin encabezado (bloque principal). */
  label?: string
  items: NavItem[]
}

/**
 * Navegación cliente-céntrica: el cliente es la puerta de entrada y dentro de su
 * ficha viven casos, tareas, documentos, notas, declaraciones, equipo y WhatsApp.
 * Las secciones de abajo son vistas transversales (todo el estudio a la vez),
 * no el camino habitual de trabajo.
 */
const navigation: NavSection[] = [
  {
    items: [
      {
        name: "Inicio",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Clientes",
        href: "/dashboard/clients",
        icon: Users,
        description: "Casos, tareas y chat de cada cliente",
      },
    ],
  },
  {
    label: "Vistas transversales",
    items: [
      {
        name: "Casos",
        href: "/dashboard/cases",
        icon: Scale,
      },
      {
        name: "Tareas",
        href: "/dashboard/tasks",
        icon: CheckSquare,
      },
      {
        name: "Agenda",
        href: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        name: "Documentos",
        href: "/dashboard/documents",
        icon: FolderOpen,
      },
    ],
  },
  {
    label: "Herramientas",
    items: [
      {
        name: "Mensajes",
        href: "/dashboard/messages",
        icon: MessageSquare,
      },
      {
        name: "Declaraciones",
        href: "/dashboard/declarations",
        icon: Mic,
      },
      {
        name: "Tiempo",
        href: "/dashboard/time",
        icon: Clock,
      },
      {
        name: "AI IMPO",
        href: "/dashboard/chat-webhook",
        icon: Bot,
      },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        name: "Usuarios",
        href: "/dashboard/admin/users",
        icon: User,
        minRole: "admin",
      },
      {
        name: "Auditoría",
        href: "/dashboard/admin/audit",
        icon: ShieldCheck,
        minRole: "admin",
      },
    ],
  },
]



function SidebarContent() {
  const router = useRouter()
  const supabase = createClient()
  const { prefetchRoute, prefetchCommonRoutes, isCurrentRoute } = useOptimizedNavigation()
  const { user, effectiveRole } = useUser()
  const visibleNavigation = navigation
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.minRole || hasRole(effectiveRole, item.minRole)),
    }))
    .filter(section => section.items.length > 0)

  useEffect(() => {
    prefetchCommonRoutes(['/dashboard', '/dashboard/clients', '/dashboard/cases', '/dashboard/tasks'])
  }, [prefetchCommonRoutes])

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
        <nav className="space-y-6">
          {visibleNavigation.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`} className="space-y-1.5">
              {section.label && (
                <p className="px-3.5 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = isCurrentRoute(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onMouseEnter={() => prefetchRoute(item.href)}
                    onFocus={() => prefetchRoute(item.href)}
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
                      "h-5 w-5 shrink-0 transition-transform duration-200",
                      "group-hover:scale-110",
                      isActive && "scale-110"
                    )} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] leading-tight">{item.name}</span>
                      {item.description && (
                        <span
                          className={cn(
                            "mt-0.5 block text-[0.6875rem] font-normal leading-tight",
                            isActive ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/55"
                          )}
                        >
                          {item.description}
                        </span>
                      )}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
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
            <p className="text-xs text-sidebar-foreground/70 truncate">{effectiveRole ? ROLE_LABELS[effectiveRole] : 'Cargando...'}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 hover:scale-[1.02]"
          >
            <Link href="/dashboard/settings" onMouseEnter={() => prefetchRoute('/dashboard/settings')}>
              <Settings className="h-4 w-4" />
              <span className="text-[0.9375rem]">Configuración</span>
            </Link>
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
