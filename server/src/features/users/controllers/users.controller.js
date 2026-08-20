import { findFirstActive } from '../repositories/users.repository.js'

export async function me(_req, res) {
  const user = await findFirstActive()
  if (!user) return res.status(404).json({ message: 'No active user found' })
  res.json({ data: user })
}
