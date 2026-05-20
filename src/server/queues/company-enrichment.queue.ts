import { Queue } from 'bullmq'
import { getRedis } from '@/lib/db/redis'

export interface CompanyEnrichmentJobData {
  organizationId: string
  userId: string
  cnpj: string
}

const QUEUE_NAME = 'company-enrichment'

let queue: Queue<CompanyEnrichmentJobData> | null = null

export function getCompanyEnrichmentQueue(): Queue<CompanyEnrichmentJobData> {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  }
  return queue
}

export async function enqueueCompanyEnrichment(data: CompanyEnrichmentJobData) {
  return getCompanyEnrichmentQueue().add('enrich-cnpj', data, {
    jobId: `company-enrichment-${data.organizationId}-${data.cnpj}`,
  })
}
