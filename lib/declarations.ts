/**
 * Una declaración se guarda como nota del caso con este encabezado (lo escribe
 * `attachDeclarationToCase`). Es lo que permite separarlas de las notas normales
 * sin tocar el esquema.
 */
export const DECLARATION_MARKER = '# Declaración'

export function isDeclarationNote(content: string | null | undefined): boolean {
  return Boolean(content?.trimStart().startsWith(DECLARATION_MARKER))
}
