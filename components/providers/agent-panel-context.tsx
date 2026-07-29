'use client'

import React, { createContext, useContext } from 'react'

interface AgentPanelContextType {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  caseId?: string
  onCaseIdChange: (caseId?: string) => void
}

const AgentPanelContext = createContext<AgentPanelContextType | undefined>(
  undefined
)

export function AgentPanelProvider({
  children,
  isOpen,
  onOpenChange,
  caseId,
  onCaseIdChange,
}: {
  children: React.ReactNode
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  caseId?: string
  onCaseIdChange: (caseId?: string) => void
}) {
  return (
    <AgentPanelContext.Provider
      value={{
        isOpen,
        onOpenChange,
        caseId,
        onCaseIdChange,
      }}
    >
      {children}
    </AgentPanelContext.Provider>
  )
}

export function useAgentPanel() {
  const context = useContext(AgentPanelContext)
  if (!context) {
    throw new Error('useAgentPanel must be used within AgentPanelProvider')
  }
  return context
}
