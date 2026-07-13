// Effective role model for the whole platform. The user_role enum keeps its
// legacy values in Postgres; everything in the app reasons in terms of these
// three roles. Keep this file isomorphic (no server imports).

export type EffectiveRole = 'admin' | 'lawyer' | 'assistant'

export function normalizeRole(dbRole: string | null | undefined): EffectiveRole | null {
  switch (dbRole) {
    case 'admin':
    case 'super_admin':
      return 'admin'
    case 'lawyer':
      return 'lawyer'
    case 'assistant':
    case 'paralegal':
    case 'intern':
      return 'assistant'
    default:
      // 'client' or unknown values get no dashboard access
      return null
  }
}

const RANK: Record<EffectiveRole, number> = { assistant: 1, lawyer: 2, admin: 3 }

export function hasRole(role: EffectiveRole | null, min: EffectiveRole): boolean {
  return role !== null && RANK[role] >= RANK[min]
}

export const ROLE_LABELS: Record<EffectiveRole, string> = {
  admin: 'Administrador',
  lawyer: 'Abogado/a',
  assistant: 'Asistente',
}
