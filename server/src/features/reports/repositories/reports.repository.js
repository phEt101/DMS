import { db } from '../../../config/database.js'

export async function getDocumentActivity() {
  const [rows] = await db.query(`
    SELECT DATE(created_at) AS date, COUNT(*) AS documents, COALESCE(SUM(file_size), 0) AS bytes
    FROM documents WHERE created_at >= CURRENT_DATE - INTERVAL 30 DAY
    GROUP BY DATE(created_at) ORDER BY date
  `)
  return rows
}
