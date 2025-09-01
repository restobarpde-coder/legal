"use client"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description: string
  itemName?: string
  loading?: boolean
  destructiveAction?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  loading = false,
  destructiveAction = true
}: DeleteConfirmationModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error('Error during deletion:', error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={description}
    >
      <div className="sm:max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          </div>
        </div>

        {itemName && (
          <Alert className="mb-4">
            <AlertDescription>
              Estás a punto de eliminar: <strong>"{itemName}"</strong>
            </AlertDescription>
          </Alert>
        )}

        {destructiveAction && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta acción no se puede deshacer. El elemento será eliminado permanentemente.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
