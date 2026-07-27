import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { buildCaseContext, serializeCaseContext } from '@/lib/case-context'

// Force dynamic to prevent static caching of 404s
export const dynamic = 'force-dynamic'

const EXTERNAL_WEBHOOK_URL = process.env.CHAT_WEBHOOK_URL

export async function POST(request: NextRequest) {
  console.log('👉 API Route /api/chat-proxy called')

  try {
    // 1. Check Environment Config
    if (!EXTERNAL_WEBHOOK_URL) {
      console.error('❌ CRITICAL: CHAT_WEBHOOK_URL is not defined in environment variables')
      return NextResponse.json({ error: 'Server configuration error: Webhook URL is not set.' }, { status: 500 })
    }

    // 2. Check Authentication
    const user = await requireAuthAPI()
    if (!user) {
      console.warn('⚠️ Authentication failed for chat proxy')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 3. Parse Request
    const body = await request.json()
    const { text, caseId } = body

    if (!text) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    // 4. Build case context when the conversation is scoped to a case.
    //    buildCaseContext ya valida el acceso: si el usuario no puede leer el
    //    caso devuelve null y el mensaje se envía sin contexto.
    let caseContext = null
    let caseContextMarkdown: string | null = null

    if (caseId) {
      caseContext = await buildCaseContext(caseId, user.id)
      if (caseContext) {
        caseContextMarkdown = serializeCaseContext(caseContext)
        console.log(`📎 Case context attached (${caseContextMarkdown.length} chars)`)
      } else {
        console.warn(`⚠️ No access to case ${caseId} for user ${user.id} — sending without context`)
      }
    }

    // 5. Forward to Webhook
    console.log('📤 Forwarding message to webhook...')
    const payload = {
      text,
      userId: user.id,
      userEmail: user.email,
      userName: user.user_metadata?.full_name || user.email,
      caseId: caseContext ? caseId : null,
      caseContext,
      caseContextMarkdown,
    }

    const response = await fetch(EXTERNAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('📥 Webhook response status:', response.status)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('❌ Webhook error:', errorBody)
      return NextResponse.json(
        { error: `Webhook responded with status: ${response.status}`, details: errorBody },
        { status: response.status }
      )
    }

    const textBody = await response.text()
    let data
    try {
      data = JSON.parse(textBody)
      console.log('✅ Webhook returned JSON')
    } catch (e) {
      console.log('⚠️ Webhook returned text (not JSON), wrapping as output')
      data = textBody
    }

    return NextResponse.json({ response: data })

  } catch (error) {
    console.error('🔥 Error in chat-proxy API route:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
