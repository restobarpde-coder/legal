// Redimensiona/recomprime imágenes pesadas en el navegador antes de subirlas,
// para entrar bajo el límite de 5MB que impone WhatsApp Cloud API para imágenes.
// Convierte todo a JPEG: WhatsApp igual reencodea las imágenes, y JPEG da mucho
// mejor ratio de compresión que PNG para fotos.

const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4]
const MAX_DIMENSION_STEPS = [2048, 1600, 1200, 900]

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/** Devuelve el mismo File si ya entra en `maxBytes`, o una versión JPEG recomprimida/redimensionada. */
export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file

  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  for (const maxDimension of MAX_DIMENSION_STEPS) {
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality)
      if (blob && blob.size <= maxBytes) {
        const name = file.name.replace(/\.\w+$/, '') + '.jpg'
        return new File([blob], name, { type: 'image/jpeg' })
      }
    }
  }

  // No se pudo bajar del límite sin degradar demasiado: se manda la mejor
  // versión obtenida (última pasada, calidad más baja) y que la validación
  // de tamaño en el composer decida si igual se bloquea el envío.
  const fallback = await canvasToBlob(canvas, QUALITY_STEPS[QUALITY_STEPS.length - 1])
  if (!fallback) return file
  const name = file.name.replace(/\.\w+$/, '') + '.jpg'
  return new File([fallback], name, { type: 'image/jpeg' })
}
