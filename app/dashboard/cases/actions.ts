'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { caseSchema, type CaseFormState } from './validation'

export async function createCase(
  prevState: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  const user = await requireAuth()
  const supabase = await createClient()

  const validatedFields = caseSchema.safeParse(
    Object.fromEntries(formData.entries())
  )

  if (!validatedFields.success) {
    return {
      message: 'Por favor, corrige los errores en el formulario.',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const data = validatedFields.data

  // Convert string numbers to appropriate types
  const caseData = {
    ...data,
    estimated_hours: data.estimated_hours ? parseInt(data.estimated_hours) : null,
    hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
    created_by: user.id
  }

  const { data: newCase, error } = await supabase
    .from('cases')
    .insert(caseData)
    .select('id')
    .single()

  if (error) {
    console.error('Create case error:', error)
    return { message: 'Error en la base de datos: No se pudo crear el caso.' }
  }

  // Add the current user as a member of the case
  const { error: memberError } = await supabase
    .from('case_members')
    .insert({
      case_id: newCase.id,
      user_id: user.id,
      role: 'owner'
    })

  if (memberError) {
    console.error('Create case member error:', memberError)
    // The case was created but membership failed, we should still redirect
    // but log the error for investigation
  }

  revalidatePath('/dashboard/cases')
  // Success will be handled by the redirect, using a query param would be too verbose
  redirect('/dashboard/cases?success=case-created')
}

export async function updateCase(
  caseId: string,
  prevState: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  await requireAuth()
  const supabase = await createClient()

  const validatedFields = caseSchema.safeParse(
    Object.fromEntries(formData.entries())
  )

  if (!validatedFields.success) {
    return {
      message: 'Por favor, corrige los errores en el formulario.',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const data = validatedFields.data

  // Convert string numbers to appropriate types
  const caseData = {
    ...data,
    estimated_hours: data.estimated_hours ? parseInt(data.estimated_hours) : null,
    hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
  }

  const { error } = await supabase
    .from('cases')
    .update(caseData)
    .eq('id', caseId)

  if (error) {
    console.error('Update case error:', error)
    return { message: 'Error en la base de datos: No se pudo actualizar el caso.' }
  }

  revalidatePath('/dashboard/cases')
  revalidatePath(`/dashboard/cases/${caseId}`)
  revalidatePath(`/dashboard/cases/${caseId}/edit`)
  redirect('/dashboard/cases?success=case-updated')
}
