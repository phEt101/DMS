import 'dotenv/config'

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function boolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

export const env = {
  nodeEnv,
  cookieSecure: boolean(process.env.COOKIE_SECURE, nodeEnv !== 'development'),
  trustProxy: integer(process.env.TRUST_PROXY, 0),
  port: integer(process.env.PORT, 3000),
  host: process.env.HOST ?? '127.0.0.1',
  projectPublicIdSecret: process.env.PROJECT_PUBLIC_ID_SECRET ?? '',
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: integer(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME ?? 'boswell_dms',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    connectionLimit: integer(process.env.DB_CONNECTION_LIMIT, 10),
  },
}
