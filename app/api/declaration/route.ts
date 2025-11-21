import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth()
    
    // Get the audio file from the form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Get n8n webhook URL from environment variables
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    // Convert the audio file to a buffer
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type })

    // Create form data for n8n
    const n8nFormData = new FormData()
    n8nFormData.append('audio', audioBlob, audioFile.name)
    n8nFormData.append('userId', user.id)
    n8nFormData.append('userEmail', user.email || '')
    
    // Forward the audio to n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: n8nFormData,
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('N8N webhook error:', errorText)
      return NextResponse.json(
        { error: 'Error processing audio with n8n' },
        { status: 500 }
      )
    }

    // Parse the response from n8n
    const n8nData = await n8nResponse.json()
    
    // Expected format from n8n: { summary: string, transcription?: string }
    if (!n8nData.summary) {
      console.error('N8N response missing summary:', n8nData)
      return NextResponse.json(
        { error: 'Invalid response from processing service' },
        { status: 500 }
      )
    }

    // Return the summary to the frontend
    return NextResponse.json({
      summary: n8nData.summary,
      transcription: n8nData.transcription,
    })

  } catch (error) {
    console.error('Error in declaration API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
