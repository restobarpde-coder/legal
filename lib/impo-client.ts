/**
 * Cliente para consultar el Banco de Datos de IMPO (Instituto de Mayoría de Edad de Uruguay)
 * https://www.impo.com.uy/
 */

export interface ImpoNorm {
  id: string
  tipo: string
  numero: string
  ano: number
  titulo: string
  contenido?: string
  articulos?: ImpoArticulo[]
}

export interface ImpoArticulo {
  numero: number
  titulo?: string
  contenido: string
}

/**
 * Arma el path correcto para una consulta a IMPO
 */
export function buildImpoPath(query: string): string {
  // Detectar tipo de norma
  const constitutionRegex = /constituci[oó]n\s+(\d{4})?/i
  const lawRegex = /ley\s+(\d+)(?:\s*\/|-)(\d{2,4})?/i
  const decreeRegex = /decreto\s+(\d+)(?:\s*\/|-)(\d{2,4})?/i
  const resolutionRegex = /resoluci[oó]n\s+(\d+)(?:\s*\/|-)(\d{2,4})?/i

  // Constitución
  if (constitutionRegex.test(query)) {
    const match = query.match(constitutionRegex)
    const year = match?.[1] || '1967'
    return `bases/constitucion/${year}-${year}`
  }

  // Ley
  if (lawRegex.test(query)) {
    const match = query.match(lawRegex)
    const number = match?.[1]
    let year = match?.[2]

    if (year) {
      // Normalizar año (2 o 3 dígitos a 4)
      if (year.length === 2) {
        year = parseInt(year) <= 50 ? `20${year}` : `19${year}`
      } else if (year.length === 3) {
        year = parseInt(year) <= 50 ? `20${year}` : `19${year}`
      }
    }

    return year ? `bases/leyes/${number}-${year}` : `bases/leyes/${number}`
  }

  // Decreto
  if (decreeRegex.test(query)) {
    const match = query.match(decreeRegex)
    const number = match?.[1]
    let year = match?.[2]

    if (year) {
      if (year.length === 2) {
        year = parseInt(year) <= 50 ? `20${year}` : `19${year}`
      } else if (year.length === 3) {
        year = parseInt(year) <= 50 ? `20${year}` : `19${year}`
      }
    }

    return year ? `bases/decretos/${number}-${year}` : `bases/decretos/${number}`
  }

  // Resolución
  if (resolutionRegex.test(query)) {
    const match = query.match(resolutionRegex)
    const number = match?.[1]
    let year = match?.[2]

    if (year && year.length === 2) {
      year = parseInt(year) <= 50 ? `20${year}` : `19${year}`
    }

    return year ? `bases/resoluciones/${number}-${year}` : `bases/resoluciones/${number}`
  }

  // Default: asumir que es un path directo
  return query
}

/**
 * Consulta IMPO y retorna el JSON
 */
export async function queryImpo(query: string): Promise<ImpoNorm | null> {
  try {
    const path = buildImpoPath(query)
    const url = `https://www.impo.com.uy/${path}?json=true`

    console.log(`[IMPO] Consultando: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Compatible)',
      },
    })

    if (!response.ok) {
      console.error(`[IMPO] Error ${response.status}: ${response.statusText}`)
      return null
    }

    const data = await response.json()
    console.log(`[IMPO] ✅ Respuesta obtenida`)

    return data
  } catch (error) {
    console.error('[IMPO] Error:', error)
    return null
  }
}

/**
 * Busca y extrae un artículo específico
 */
export function extractArticle(norm: ImpoNorm, articleNumber: number): ImpoArticulo | null {
  if (!norm.articulos) return null
  return norm.articulos.find((a) => a.numero === articleNumber) || null
}
