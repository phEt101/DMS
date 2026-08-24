import fs from 'node:fs/promises'
import path from 'node:path'

const source = path.resolve('database/migrations')
const destination = path.resolve('dist/database/migrations')

await fs.rm(destination, { recursive: true, force: true })
await fs.mkdir(path.dirname(destination), { recursive: true })
await fs.cp(source, destination, { recursive: true })
