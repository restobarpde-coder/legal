import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
    password: z.string().min(1, { message: 'Por favor, introduce tu contraseña.' }),
})

export type LoginFormState = {
    message: string
    errors?: {
        email?: string[]
        password?: string[]
    }
}
