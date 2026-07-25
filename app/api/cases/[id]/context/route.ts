import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { buildCaseContext, serializeCaseContext } from '@/lib/case-context'

export const dynamic = 'force-dynamic'

/**
 * Contexto completo del caso, listo para alimentar un modelo.
 *
 *   GET /api/cases/:id/context             → JSON estructurado
 *   GET /api/cases/:id/context?format=md   → Markdown para prompt
 *   GET /api/cases/:id/context?textLimit=N → corte de textos largos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: caseId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')
    const rawLimit = Number(searchParams.get('textLimit'))
    const textLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 20000) : undefined

    const context = await buildCaseContext(caseId, user.id, { textLimit })

    if (!context) {
      return NextResponse.json({ error: 'Caso no encontrado o sin acceso' }, { status: 404 })
    }

    if (format === 'md' || format === 'markdown') {
      return new NextResponse(serializeCaseContext(context), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'private, no-store',
        },
      })
    }

    return NextResponse.json(context, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Error building case context:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
