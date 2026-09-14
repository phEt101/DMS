import { createHmac, randomBytes } from 'node:crypto'
import { env } from '../../../config/env.js'

function publicIdSecret() {
  if (env.documentPublicIdSecret.length < 32) {
    throw new Error('DOCUMENT_PUBLIC_ID_SECRET must contain at least 32 characters')
  }
  return env.documentPublicIdSecret
}

export function createDocumentPublicId(documentId: number | string) {
  return createHmac('sha256', publicIdSecret()).update(`documents:${documentId}`).digest('base64url')
}

export function createTemporaryDocumentPublicId() {
  return randomBytes(32).toString('base64url')
}

export function isDocumentPublicId(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value)
}
