import type { Request, Response } from 'express'
import * as repo from '../repositories/postal-codes.repository.js'

export async function listProvinces(req: Request, res: Response) {
  const rows = await repo.getProvinces()
  res.json(rows.map((r) => r.province))
}

export async function listDistricts(req: Request, res: Response) {
  const province = String(req.query.province || '')
  if (!province) return res.status(400).json({ message: 'province is required' })
  const rows = await repo.getDistricts(province)
  res.json(rows.map((r) => r.district))
}

export async function listSubdistricts(req: Request, res: Response) {
  const province = String(req.query.province || '')
  const district = String(req.query.district || '')
  if (!province || !district) return res.status(400).json({ message: 'province and district are required' })
  const rows = await repo.getSubdistricts(province, district)
  res.json(rows.map((r) => r.subdistrict))
}

export async function getPostalCode(req: Request, res: Response) {
  const province = String(req.query.province || '')
  const district = String(req.query.district || '')
  const subdistrict = String(req.query.subdistrict || '')
  if (!province || !district || !subdistrict) return res.status(400).json({ message: 'province, district and subdistrict are required' })
  const row = await repo.getPostalCode(province, district, subdistrict)
  res.json({ postalCode: row?.postalCode ?? null })
}
