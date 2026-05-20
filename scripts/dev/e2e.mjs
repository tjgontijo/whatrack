import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = dirname(__dirname)

// Load .env with override so TEST_DATABASE_URL can be provided centrally
const result = dotenv.config({ path: join(projectRoot, '.env'), override: true })

// Merge loaded env vars into process.env
if (result.parsed) {
  Object.assign(process.env, result.parsed)
}

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: process.env,
  cwd: projectRoot,
})

const forward = (signal) => {
  if (!child.killed) {
    child.kill(signal)
  }
}

process.on('SIGINT', () => forward('SIGINT'))
process.on('SIGTERM', () => forward('SIGTERM'))
process.on('SIGHUP', () => forward('SIGHUP'))

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
