import { findRecent } from '../repositories/activity.repository.js'

export async function index(req, res) {
  const requested = Number.parseInt(req.query.limit, 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 200) : 100
  res.json({ data: await findRecent(limit) })
}
