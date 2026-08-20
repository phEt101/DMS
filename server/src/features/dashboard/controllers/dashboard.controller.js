import { getSummary } from '../repositories/dashboard.repository.js'

export async function show(_req, res) {
  res.json({ data: await getSummary() })
}
