import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth' // Assuming requireAuth is suitable for API routes

const EXTERNAL_WEBHOOK_URL = process.env.CHAT_WEBHOOK_URL

export async function POST(request: NextRequest) {
  try {
    if (!EXTERNAL_WEBHOOK_URL) {
      console.error('CHAT_WEBHOOK_URL environment variable is not set.')
      return NextResponse.json({ error: 'Server configuration error: Webhook URL is not set.' }, { status: 500 })
    }

    const user = await requireAuth() // Get the authenticated user
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    const payload = {
      text,
      userId: user.id, // Include the user ID
    }

    // Forward the message to the external webhook
    const response = await fetch(EXTERNAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('content-type') // Declare contentType here

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('External webhook error:', response.status, errorBody)
      return NextResponse.json(
        { error: `Webhook responded with status: ${response.status}`, details: errorBody },
        { status: response.status }
      )
    }

    // Read the response from the external webhook
    let webhookResponseData: any
    const responseText = await response.text() // Read as text first

    if (contentType && contentType.includes('application/json') && responseText.trim().length > 0) {
      try {
        webhookResponseData = JSON.parse(responseText) // Try to parse if not empty
      } catch (jsonError) {
        console.warn('Webhook indicated JSON but provided invalid JSON. Falling back to text.', jsonError)
        webhookResponseData = responseText // Fallback to text if JSON parsing fails
      }
    } else {
      webhookResponseData = responseText // Already read as text, so assign it
    }

    // Return the webhook's response to the client
    console.log('Webhook response data being sent to client:', webhookResponseData)
    return NextResponse.json({ response: webhookResponseData })
  } catch (error) {
    console.error('Error in chat-proxy API route:', error instanceof Error ? error.name + ': ' + error.message + '\n' + error.stack : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
