import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES  = 12
const TAG_BYTES = 16

function getKey(): Buffer {
  const raw = process.env.INBOX_ENCRYPTION_KEY
  if (!raw) throw new Error('INBOX_ENCRYPTION_KEY env var is not set')
  // Accept exactly 64 hex chars (32 bytes) or any string (SHA-256 derived)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  return createHash('sha256').update(raw).digest()
}

/**
 * Encrypts a plaintext string.
 * Returns a compact string: "<iv_b64>:<tag_b64>:<ciphertext_b64>"
 * Safe to store in the database; never log the input or output.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(IV_BYTES)

  const cipher    = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Decrypts a value produced by encrypt().
 * Throws if the format is invalid or the authentication tag doesn't match.
 */
export function decrypt(stored: string): string {
  const key   = getKey()
  const parts = stored.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format')

  const iv         = Buffer.from(parts[0], 'base64')
  const tag        = Buffer.from(parts[1], 'base64')
  const ciphertext = Buffer.from(parts[2], 'base64')

  if (iv.length !== IV_BYTES)   throw new Error('Invalid IV length')
  if (tag.length !== TAG_BYTES) throw new Error('Invalid auth tag length')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}

/**
 * Constant-time comparison of two HMAC digests.
 * Use when verifying webhook signatures.
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}
