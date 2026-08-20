import { app } from './app.js'
import { db } from './config/database.js'
import { env } from './config/env.js'

const server = app.listen(env.port, env.host, () => {
  console.log(`Boswell DMS API listening at http://${env.host}:${env.port}`)
})

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received, shutting down`)
  server.close(async (error) => {
    await db.end()
    process.exit(error ? 1 : 0)
  })
  server.closeIdleConnections()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
