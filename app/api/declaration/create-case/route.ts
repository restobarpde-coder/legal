import { NextRequest, NextResponse } from 'next/server'
import { createCaseFromDeclaration } from '@/app/dashboard/declarations/actions'
import { requireAuthAPI } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthAPI()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()

    const clientId = formData.get('clientId') as string
    const title = formData.get('title') as string
    const summary = formData.get('summary') as string
    const transcription = formData.get('transcription') as string | null
    const audioFile = formData.get('audio') as File | null

    if (!clientId || !title || !summary) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const declaration = {
      summary,
      transcription: transcription || undefined,
      audioFile: audioFile || undefined,
    }

    const result = await createCaseFromDeclaration(clientId, title, declaration, user)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in create case from declaration API:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
