"use client"

import { ReactNode } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
}

export function Modal({ isOpen, onClose, children, title, description }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {title ? (
          <DialogTitle>{title}</DialogTitle>
        ) : (
          <VisuallyHidden>
            <DialogTitle>Modal</DialogTitle>
          </VisuallyHidden>
        )}
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : (
          <VisuallyHidden>
            <DialogDescription>Modal content</DialogDescription>
          </VisuallyHidden>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}
