import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const documentType = formData.get('documentType') as string
    const description = formData.get('description') as string

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
    }

    let uploadedCount = 0
    let failedCount = 0
    const uploadedDocuments = []

    // Process each file
    for (const file of files) {
      try {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          failedCount++
          continue
        }

        // Create unique filename with timestamp and original name
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const fileName = `${user.id}/${caseId}/${timestamp}-${file.name}`

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error for', file.name, ':', uploadError)
          failedCount++
          continue
        }

        // Save document metadata to database
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            mime_type: file.type,
            document_type: documentType,
            description: description || null,
            case_id: caseId,
            uploaded_by: user.id
          })
          .select()
          .single()

        if (dbError) {
          console.error('Database error for', file.name, ':', dbError)
          failedCount++
          continue
        }

        uploadedDocuments.push(document)
        uploadedCount++
      } catch (fileError) {
        console.error('Error processing file', file.name, ':', fileError)
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      uploadedCount,
      failedCount,
      documents: uploadedDocuments
    })
  } catch (error) {
    console.error('Error in documents API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    await requireAuth()

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Error fetching documents' }, { status: 500 })
    }

    return NextResponse.json(documents || [])
  } catch (error) {
    console.error('Error in documents API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
