'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { caseSchema, type CaseFormState } from './validation'

export async function createCase(
  prevState: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  console.log('=== CASE CREATION STARTED ===')
  console.log('Form data entries:', Object.fromEntries(formData.entries()))
  
  const user = await requireAuth()
  console.log('User authenticated:', user.id)
  
  const supabase = await createClient()
  
  // Ensure user exists in users table (this creates it if not exists)
  const userProfile = await getUserProfile()
  if (!userProfile) {
    console.error('Could not get or create user profile')
    return { message: 'Error: No se pudo obtener el perfil del usuario.' }
  }
  
  console.log('User profile:', userProfile)

  const validatedFields = caseSchema.safeParse(
    Object.fromEntries(formData.entries())
  )
  
  console.log('Validation result:', validatedFields)

  if (!validatedFields.success) {
    return {
      message: 'Por favor, corrige los errores en el formulario.',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const data = validatedFields.data

  // Convert string numbers to appropriate types and handle optional dates
  const caseData = {
    ...data,
    estimated_hours: data.estimated_hours ? parseInt(data.estimated_hours) : null,
    hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
    start_date: data.start_date && data.start_date.trim() !== '' ? data.start_date : null,
    end_date: data.end_date && data.end_date.trim() !== '' ? data.end_date : null,
    created_by: user.id
  }

  console.log('Final case data to insert:', caseData)

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

  // Convert string numbers to appropriate types and handle optional dates
  const caseData = {
    ...data,
    estimated_hours: data.estimated_hours ? parseInt(data.estimated_hours) : null,
    hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
    start_date: data.start_date && data.start_date.trim() !== '' ? data.start_date : null,
    end_date: data.end_date && data.end_date.trim() !== '' ? data.end_date : null,
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
