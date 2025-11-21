'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

type UserProfile = {
    id: string
    email: string
    full_name: string
    role: string
    phone?: string | null
}

type UserContextType = {
    user: UserProfile | null
    isLoading: boolean
    error: Error | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

async function fetchUserProfile(): Promise<UserProfile> {
    const res = await fetch('/api/user/profile')
    if (!res.ok) {
        throw new Error('Failed to fetch user profile')
    }
    return res.json()
}

export function UserProvider({ children }: { children: ReactNode }) {
    const { data: user = null, isLoading, error } = useQuery({
        queryKey: ['user-profile'],
        queryFn: fetchUserProfile,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        retry: 1,
    })

    return (
        <UserContext.Provider value={{ user, isLoading, error: error as Error | null }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}
