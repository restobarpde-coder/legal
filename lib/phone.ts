// Phone normalization for WhatsApp. Uruguay (+598) is the default country.
// wa_contact_id / Meta's wa_id use international digits WITHOUT '+'.

export type NormalizedPhone = {
  /** +59899111222 — display / storage format */
  e164: string
  /** 59899111222 — WhatsApp contact id format */
  waId: string
}

export function normalizePhoneUY(raw: string | null | undefined): NormalizedPhone | null {
  if (!raw) return null

  const hadPlus = raw.trim().startsWith('+')
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  // International call prefix
  if (digits.startsWith('00')) digits = digits.slice(2)

  if (hadPlus || digits.startsWith('598')) {
    // Already international. Uruguay mobiles sometimes come as +598 099… — drop
    // the trunk 0 after the country code.
    if (digits.startsWith('5980')) digits = '598' + digits.slice(4)
  } else if (digits.startsWith('0')) {
    // Local format with trunk zero: 099 111 222 → 59899111222
    digits = '598' + digits.slice(1)
  } else if (digits.length === 8 && digits.startsWith('9')) {
    // Bare mobile: 99111222 → 59899111222
    digits = '598' + digits
  } else if (digits.length <= 9) {
    // Other short local numbers (landlines etc.)
    digits = '598' + digits
  }
  // Anything longer without '+' is assumed to already carry a country code.

  if (digits.length < 10 || digits.length > 15) return null

  return { e164: `+${digits}`, waId: digits }
}
