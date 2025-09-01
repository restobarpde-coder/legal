'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { clientSchema, type ClientFormState } from './validation'

export async function createClientAction(
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

    // Clean up empty strings to null for optional fields
    const clientData = {
        ...validatedFields.data,
        email: validatedFields.data.email || null,
        phone: validatedFields.data.phone || null,
        address: validatedFields.data.address || null,
        company: validatedFields.data.company || null,
        notes: validatedFields.data.notes || null,
        created_by: user.id
    }

    const { error } = await supabase
        .from('clients')
        .insert(clientData)

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
