import { AuditHistory } from '@/components/audit-history'
import { Shield } from 'lucide-react'

export default function AuditPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Auditoría del Sistema
          </h2>
          <p className="text-muted-foreground">
            Sistema de registro inmutable con verificación criptográfica
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Sistema de Auditoría Blockchain-like
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Cada cambio es registrado con hash SHA-256</li>
            <li>✓ Cadena de integridad verificable (blockchain-like)</li>
            <li>✓ Registros inmutables - no se pueden editar ni eliminar</li>
            <li>✓ Trazabilidad completa de quién hizo qué y cuándo</li>
            <li>✓ Protección contra manipulación de datos</li>
          </ul>
        </div>

        <AuditHistory showIntegrityCheck={true} />
      </div>
    </div>
  )
}
