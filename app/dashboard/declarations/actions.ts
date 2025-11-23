

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'

export type DeclarationData = {
  summary: string
  transcription?: string
  audioFile?: File
}

import { User } from '@supabase/supabase-js'

// Save declaration as a document/note attached to a case
export async function attachDeclarationToCase(
  caseId: string,
  declaration: DeclarationData,
  injectedUser?: User
) {
  try {
    const user = injectedUser || await requireAuth()
    console.log('User authenticated:', user.id)
    const supabase = await createClient()

    // Save audio file to Supabase Storage if provided
    let audioDocumentId = null
    if (declaration.audioFile) {
      console.log('Processing audio file:', {
        name: declaration.audioFile.name,
        type: declaration.audioFile.type,
        size: declaration.audioFile.size
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const fileName = `${user.id}/${caseId}/${timestamp}-declaracion.webm`

      const arrayBuffer = await declaration.audioFile.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, fileBuffer, {
          contentType: 'application/octet-stream', // Fallback to generic binary type
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading audio to storage:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      } else if (uploadData) {
        console.log('Audio uploaded successfully:', uploadData.path)

        // Save document metadata to database
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .insert({
            name: 'Declaración - Audio.webm',
            file_path: uploadData.path,
            file_size: declaration.audioFile.size,
            mime_type: 'audio/webm',
            document_type: 'audio',
            description: 'Grabación de declaración',
            case_id: caseId,
            uploaded_by: user.id
          })
          .select('id')
          .single()

        if (dbError) {
          console.error('Error saving audio document to database:', dbError)
          throw new Error(`Database document save failed: ${dbError.message}`)
        } else if (document) {
          console.log('Audio document saved to database:', document.id)
          audioDocumentId = document.id
        }
      }
    } else {
      console.log('No audio file provided in declaration')
    }

    // Create a note for the case with the declaration content
    const noteContent = `# Declaración\n\n## Resumen\n${declaration.summary}\n\n${declaration.transcription ? `## Transcripción Completa\n${declaration.transcription}\n\n` : ''}${audioDocumentId ? `_Audio guardado como documento_` : ''}`

    const { data, error } = await supabase
      .from('notes')
      .insert({
        case_id: caseId,
        content: noteContent,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error attaching declaration:', error)
      return { success: false, message: 'Error al adjuntar la declaración al caso' }
    }

    revalidatePath(`/dashboard/cases/${caseId}`)
    return { success: true, data }
  } catch (error) {
    console.error('Error in attachDeclarationToCase:', error)
    return { success: false, message: 'Error interno del servidor' }
  }
}

// Create a new case from a declaration
// Create a new case from a declaration
export async function createCaseFromDeclaration(
  clientId: string,
  title: string,
  declaration: DeclarationData,
  injectedUser?: User
) {
  try {
    const user = injectedUser || await requireAuth()
    const supabase = await createClient()

    // Create the case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        title,
        description: declaration.summary,
        client_id: clientId,
        status: 'active',
        priority: 'medium',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (caseError) {
      console.error('Error creating case:', caseError)
      return { success: false, message: 'Error al crear el caso' }
    }

    // Add the current user as a member of the case
    const { error: memberError } = await supabase
      .from('case_members')
      .insert({
        case_id: newCase.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('Error adding case member:', memberError)
    }

    // Attach the full declaration as a note
    await attachDeclarationToCase(newCase.id, declaration, user)

    revalidatePath('/dashboard/cases')
    return { success: true, caseId: newCase.id }
  } catch (error) {
    console.error('Error in createCaseFromDeclaration:', error)
    return { success: false, message: 'Error interno del servidor' }
  }
}

// Get all cases for dropdown selection
export async function getCasesForSelection() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get cases where user is a member
    const { data: userCases, error: memberError } = await supabase
      .from('case_members')
      .select('case_id')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching user cases:', memberError)
      return []
    }

    const caseIds = userCases?.map((uc) => uc.case_id) || []

    if (caseIds.length === 0) {
      return []
    }

    // Get case details
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, title, status, clients(name)')
      .in('id', caseIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (casesError) {
      console.error('Error fetching cases:', casesError)
      return []
    }

    // Transform the data to match the expected type (clients as single object, not array)
    return (cases || []).map(c => ({
      id: c.id,
      title: c.title,
      clients: Array.isArray(c.clients) && c.clients.length > 0 ? c.clients[0] : null
    }))
  } catch (error) {
    console.error('Error in getCasesForSelection:', error)
    return []
  }
}

// Get all clients for dropdown selection
export async function getClientsForSelection() {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, company')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching clients:', error)
      return []
    }

    return clients || []
  } catch (error) {
    console.error('Error in getClientsForSelection:', error)
    return []
  }
}
