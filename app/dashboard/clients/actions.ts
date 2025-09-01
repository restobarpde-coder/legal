'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'

export const clientSchema = z.object({
    name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    email: z.string().email({ message: 'Email inválido.' }).optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    company: z.string().optional(),
    notes: z.string().optional(),
})

export type ClientFormState = {
    message: string
    errors?: z.ZodError<z.infer<typeof clientSchema>>['formErrors']['fieldErrors']
}

export async function createClient(
    prevState: ClientFormState,
    formData: FormData
): Promise<ClientFormState> {
    const user = await requireAuth()
    const supabase = await createClient()

    const validatedFields = clientSchema.safeParse(
        Object.fromEntries(formData.entries())
    )

    if (!validatedFields.success) {
        return {
            message: 'Por favor, corrige los errores en el formulario.',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { error } = await supabase
        .from('clients')
        .insert({ ...validatedFields.data, created_by: user.id })

    if (error) {
        console.error('Create client error:', error)
        return { message: 'Error en la base de datos: No se pudo crear el cliente.' }
    }

    revalidatePath('/dashboard/clients')
    redirect('/dashboard/clients')
}

export async function updateClient(
    clientId: string,
    prevState: ClientFormState,
    formData: FormData
): Promise<ClientFormState> {
    await requireAuth()
    const supabase = await createClient()

    const validatedFields = clientSchema.safeParse(
        Object.fromEntries(formData.entries())
    )

    if (!validatedFields.success) {
        return {
            message: 'Por favor, corrige los errores en el formulario.',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { error } = await supabase
        .from('clients')
        .update(validatedFields.data)
        .eq('id', clientId)

    if (error) {
        console.error('Update client error:', error)
        return { message: 'Error en la base de datos: No se pudo actualizar el cliente.' }
    }

    revalidatePath('/dashboard/clients')
    revalidatePath(`/dashboard/clients/${clientId}`)
    revalidatePath(`/dashboard/clients/${clientId}/edit`)
    redirect('/dashboard/clients')
}
