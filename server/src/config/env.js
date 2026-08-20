import 'dotenv/config'

function integer(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: integer(process.env.PORT, 3000),
  host: process.env.HOST ?? '127.0.0.1',
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: integer(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME ?? 'boswell_dms',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    connectionLimit: integer(process.env.DB_CONNECTION_LIMIT, 10),
  },
}
