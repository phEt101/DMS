import { Router } from 'express'
import * as controller from '../controllers/postal-codes.controller.js'

export const postalCodesRouter = Router()

postalCodesRouter.get('/provinces', controller.listProvinces)
postalCodesRouter.get('/districts', controller.listDistricts)
postalCodesRouter.get('/subdistricts', controller.listSubdistricts)
postalCodesRouter.get('/postal-code', controller.getPostalCode)
