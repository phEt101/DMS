import type { Connection } from 'mysql2/promise'

export async function up(_connection: Connection) {
  // Administrator accounts must be provisioned explicitly, not from a shared
  // initial password stored in environment configuration.
}
