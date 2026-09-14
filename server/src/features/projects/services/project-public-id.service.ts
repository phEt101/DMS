import { createHmac, randomBytes } from 'node:crypto'
import { env } from '../../../config/env.js'

function publicIdSecret() {
  if (env.projectPublicIdSecret.length < 32) {
    throw new Error('PROJECT_PUBLIC_ID_SECRET must contain at least 32 characters')
  }
  return env.projectPublicIdSecret
}

export function createProjectPublicId(projectId: number | string) {
  return createHmac('sha256', publicIdSecret()).update(`projects:${projectId}`).digest('base64url')
}

export function createTemporaryProjectPublicId() {
  return randomBytes(32).toString('base64url')
}

export function isProjectPublicId(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value)
}
