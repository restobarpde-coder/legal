import { UsersAdminClient } from '@/components/admin/users-admin-client'

// Role gating happens in app/dashboard/admin/layout.tsx.
export default function AdminUsersPage() {
  return <UsersAdminClient />
}
