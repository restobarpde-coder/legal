'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loginSchema, type LoginFormState } from './validation'

export async function loginAction(
    prevState: LoginFormState,
    formData: FormData
): Promise<LoginFormState> {
    const validatedFields = loginSchema.safeParse(
        Object.fromEntries(formData.entries())
    )

    if (!validatedFields.success) {
        return {
            message: 'Error de validación.',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { email, password } = validatedFields.data

    try {
        const supabase = await createClient()
        
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('Login error:', error.message)
            return {
                message: 'Credenciales inválidas. Por favor, intenta de nuevo.',
            }
        }
        
        // Redirect to dashboard
        redirect('/')
        
    } catch (criticalError: any) {
        // NEXT_REDIRECT is expected when using redirect()
        if (criticalError?.message === 'NEXT_REDIRECT') {
            throw criticalError // Re-throw for Next.js to handle redirection
        }
        
        console.error('Critical login error:', criticalError)
        return {
            message: 'Error interno del servidor. Intenta de nuevo.',
        }
    }
}

