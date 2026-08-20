import { getDocumentActivity } from '../repositories/reports.repository.js'

export async function documents(_req, res) {
  res.json({ data: await getDocumentActivity() })
}
