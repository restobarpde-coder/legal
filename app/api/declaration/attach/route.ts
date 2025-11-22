import { NextRequest, NextResponse } from 'next/server'
import { attachDeclarationToCase } from '@/app/dashboard/declarations/actions'
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

    const caseId = formData.get('caseId') as string
    const summary = formData.get('summary') as string
    const transcription = formData.get('transcription') as string | null
    const audioFile = formData.get('audio') as File | null

    if (!caseId || !summary) {
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

    console.log('Attach API: Calling attachDeclarationToCase')
    const result = await attachDeclarationToCase(caseId, declaration, user)
    console.log('Attach API: Result:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in attach declaration API:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
