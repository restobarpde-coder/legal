import { z } from 'zod'

export const clientSchema = z.object({
    name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    company: z.string().optional(),
    notes: z.string().optional(),
})

export type ClientFormState = {
    message: string
    errors?: z.ZodError<z.infer<typeof clientSchema>>['formErrors']['fieldErrors']
}
