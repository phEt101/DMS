import { db } from '../../../config/database.js'

export async function show(_req, res) {
  await db.query('SELECT 1')
  res.json({ status: 'ok' })
}
