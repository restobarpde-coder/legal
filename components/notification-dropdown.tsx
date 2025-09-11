'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Bell, CheckSquare } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import Link from 'next/link'

export function NotificationDropdown() {
  const { data: notifications, isLoading, error } = useNotifications()

  const unreadCount = notifications?.length || 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
        ) : error ? (
          <DropdownMenuItem disabled>Error al cargar</DropdownMenuItem>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild>
              <Link href={`/dashboard/cases/${notification.caseId}`}>
                <div className="flex items-start gap-3">
                  <CheckSquare className="h-4 w-4 mt-1 text-blue-500" />
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence hoy: {new Date(notification.dueDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No hay notificaciones</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
