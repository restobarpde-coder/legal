import { getUserProfile } from "@/lib/auth"
import { CasesClient } from './cases-client'
import { Suspense } from 'react'

export default async function CasesPage() {
  const userProfile = await getUserProfile()
  const canCreateCases = userProfile?.role === 'lawyer' || userProfile?.role === 'admin'

  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Casos</h1>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </div>
    }>
      <CasesClient userCanCreateCases={canCreateCases} />
    </Suspense>
  )
}
