import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Cargando página" className="space-y-6">
      <span className="sr-only">Cargando página...</span>
      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-80 w-full" aria-hidden="true" />
    </div>
  )
}
