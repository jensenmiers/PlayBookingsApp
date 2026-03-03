import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { internalError } from '@/utils/errorHandling'

const ALGORITHM = 'aes-256-gcm'

function resolveKeyMaterial(): string {
  return (
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || ''
  )
}

function getEncryptionKey(): Buffer {
  const material = resolveKeyMaterial()
  if (!material) {
    throw internalError('Server misconfiguration for calendar token encryption')
  }

  // Stable 32-byte key derivation from configured secret material.
  return createHash('sha256').update(material).digest()
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.')
}

export function decryptSecret(ciphertext: string): string {
  const [ivBase64, authTagBase64, encryptedBase64] = ciphertext.split('.')
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw internalError('Invalid encrypted token payload')
  }

  const key = getEncryptionKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivBase64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
