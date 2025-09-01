'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Suspense } from 'react'

function ToastContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')

  useEffect(() => {
    if (success === 'case-created') {
      toast.success('¡Caso creado exitosamente!', {
        description: 'El nuevo caso ha sido registrado en el sistema.',
      })
    } else if (success === 'case-updated') {
      toast.success('¡Caso actualizado exitosamente!', {
        description: 'Los cambios han sido guardados correctamente.',
      })
    }
  }, [success])

  return null
}

export function SuccessToast() {
  return (
    <Suspense fallback={null}>
      <ToastContent />
    </Suspense>
  )
}
