import { db } from '../../../../config/database.js'

export interface SurveyLogInput {
  surveyId: number | null
  surveyNo?: string | null
  projectName?: string | null
  userId?: number | null
  action: 'created' | 'updated' | 'deleted'
  details?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function logSurveyChange({
  surveyId,
  surveyNo = null,
  projectName = null,
  userId = null,
  action,
  details = null,
  ipAddress = null,
}: SurveyLogInput) {
  await db.execute(
    `INSERT INTO survey_logs (
      survey_id, survey_no, project_name, user_id, action, details, ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      surveyId,
      surveyNo,
      projectName,
      userId,
      action,
      details ? JSON.stringify(details) : null,
      ipAddress,
    ],
  )
}
