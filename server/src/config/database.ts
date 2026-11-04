import mysql from 'mysql2/promise'
import { env } from './env.js'

export const db = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  queueLimit: 0,
  decimalNumbers: true,
})
