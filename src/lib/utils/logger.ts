import pino from 'pino'

const nextPrerenderControlFlowDigests = new Set([
  'HANGING_PROMISE_REJECTION',
  'NEXT_PRERENDER_INTERRUPTED',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasNextPrerenderControlFlowError(value: unknown, depth = 0): boolean {
  if (!isRecord(value) || depth > 4) return false

  if (typeof value.digest === 'string' && nextPrerenderControlFlowDigests.has(value.digest)) {
    return true
  }

  return (
    hasNextPrerenderControlFlowError(value.err, depth + 1) ||
    hasNextPrerenderControlFlowError(value.cause, depth + 1)
  )
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['password', 'token', 'secret', 'cpf', 'authorization'],
  hooks: {
    logMethod(inputArgs, method, level) {
      // Next throws these as prerender control flow; route catch blocks may log before rethrowing.
      if (level >= 50 && inputArgs.some((arg) => hasNextPrerenderControlFlowError(arg))) {
        return
      }

      method.apply(this, inputArgs)
    },
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
})
