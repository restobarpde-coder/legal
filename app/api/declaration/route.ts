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

    console.log('Processing audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    })

    // Convert the audio file to a buffer
    const audioBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(audioBuffer)

    // Create form data for n8n using proper File constructor
    const n8nFormData = new FormData()
    const audioFileForN8n = new File([buffer], audioFile.name, { type: audioFile.type })
    n8nFormData.append('audio', audioFileForN8n)
    n8nFormData.append('userId', user.id)
    n8nFormData.append('userEmail', user.email || '')
    
    console.log('Sending to n8n webhook:', n8nWebhookUrl)
    
    // Forward the audio to n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: n8nFormData,
    })
    
    console.log('N8N response status:', n8nResponse.status)

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('N8N webhook error:', {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        body: errorText
      })
      return NextResponse.json(
        { error: 'Error processing audio with n8n', details: errorText },
        { status: 500 }
      )
    }

    // Parse the response from n8n
    const responseText = await n8nResponse.text()
    console.log('N8N raw response:', responseText)
    
    // Try to parse as JSON first
    let n8nData
    let isPlainText = false
    
    try {
      n8nData = JSON.parse(responseText)
      console.log('N8N parsed as JSON:', n8nData)
    } catch (e) {
      // If not JSON, treat as plain text
      console.log('N8N response is plain text')
      isPlainText = true
      n8nData = { summary: responseText }
    }
    
    // Handle response based on format
    let summary: string
    let transcription: string | undefined
    
    if (isPlainText) {
      // Plain text response - use as summary
      summary = responseText.trim()
    } else {
      // JSON response - extract fields
      summary = n8nData.summary || n8nData.text || n8nData.transcription || JSON.stringify(n8nData, null, 2)
      transcription = n8nData.transcription
    }

    // Return the summary to the frontend
    return NextResponse.json({
      summary,
      transcription,
      rawResponse: n8nData
    })

  } catch (error) {
    console.error('Error in declaration API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
