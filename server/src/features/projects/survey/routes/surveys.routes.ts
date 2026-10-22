import { Router } from 'express'
import { asyncHandler } from '../../../../middleware/errors.js'
import {
  handleCreateSurvey,
  handleDeleteSurvey,
  handleEquipmentTypes,
  handleGetSurvey,
  handleListSurveys,
  handleSurveyFile,
  handleUpdateSurvey,
} from '../controllers/surveys.controller.js'
import { surveyFilesUpload } from '../middleware/survey-files.middleware.js'

export const surveysRouter = Router()

surveysRouter.get('/', handleListSurveys)
surveysRouter.get('/files/:id', asyncHandler(handleSurveyFile))
surveysRouter.get('/equipment-types/list', asyncHandler(handleEquipmentTypes))
surveysRouter.get('/:id', handleGetSurvey)
surveysRouter.post('/', surveyFilesUpload.any(), handleCreateSurvey)
surveysRouter.put('/:id', surveyFilesUpload.any(), handleUpdateSurvey)
surveysRouter.delete('/:id', handleDeleteSurvey)
