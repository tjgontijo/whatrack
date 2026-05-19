import 'dotenv/config'
import { startWorkers } from './server/workers'
import { logger } from './lib/utils/logger'

startWorkers()

logger.info('[Worker] Process started. Waiting for jobs...')

process.on('SIGINT', () => {
  logger.info('[Worker] Gracefully shutting down...')
  process.exit(0)
})
