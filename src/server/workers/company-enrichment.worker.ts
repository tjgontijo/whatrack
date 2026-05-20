import { Worker } from 'bullmq'
import { fetchCnpjData } from '@/features/company/services/receitaws'
import { prisma } from '@/lib/db/prisma'
import { getRedis } from '@/lib/db/redis'
import { logger } from '@/lib/utils/logger'
import type { CompanyEnrichmentJobData } from '@/server/queues/company-enrichment.queue'

export const companyEnrichmentWorker = new Worker<CompanyEnrichmentJobData>(
  'company-enrichment',
  async (job) => {
    const { organizationId, userId, cnpj } = job.data

    logger.info({ organizationId, cnpj, jobId: job.id }, '[Company Enrichment Worker] Processing')

    const companyData = await fetchCnpjData(cnpj)

    const existingByCnpj = await prisma.organizationCompany.findUnique({
      where: { cnpj: companyData.cnpj },
      select: { organizationId: true },
    })

    if (existingByCnpj && existingByCnpj.organizationId !== organizationId) {
      throw new Error('Este CNPJ já está vinculado a outra organização')
    }

    await prisma.organizationCompany.upsert({
      where: { organizationId },
      update: {
        cnpj: companyData.cnpj,
        razaoSocial: companyData.razaoSocial,
        nomeFantasia: companyData.nomeFantasia || null,
        cnaeCode: companyData.cnaeCode || '',
        cnaeDescription: companyData.cnaeDescription || '',
        municipio: companyData.municipio || '',
        uf: (companyData.uf || '').toUpperCase(),
        tipo: companyData.tipo || null,
        porte: companyData.porte || null,
        naturezaJuridica: companyData.naturezaJuridica || null,
        capitalSocial: companyData.capitalSocial ?? null,
        situacao: companyData.situacao || null,
        dataAbertura: companyData.dataAbertura || null,
        dataSituacao: companyData.dataSituacao || null,
        logradouro: companyData.logradouro || null,
        numero: companyData.numero || null,
        complemento: companyData.complemento || null,
        bairro: companyData.bairro || null,
        cep: companyData.cep || null,
        email: companyData.email || null,
        telefone: companyData.telefone || null,
        qsa: companyData.qsa ? (companyData.qsa as unknown as object) : undefined,
        atividadesSecundarias: companyData.atividadesSecundarias
          ? (companyData.atividadesSecundarias as unknown as object)
          : undefined,
        authorizedByUserId: userId,
      },
      create: {
        organizationId,
        cnpj: companyData.cnpj,
        razaoSocial: companyData.razaoSocial,
        nomeFantasia: companyData.nomeFantasia || null,
        cnaeCode: companyData.cnaeCode || '',
        cnaeDescription: companyData.cnaeDescription || '',
        municipio: companyData.municipio || '',
        uf: (companyData.uf || '').toUpperCase(),
        tipo: companyData.tipo || null,
        porte: companyData.porte || null,
        naturezaJuridica: companyData.naturezaJuridica || null,
        capitalSocial: companyData.capitalSocial ?? null,
        situacao: companyData.situacao || null,
        dataAbertura: companyData.dataAbertura || null,
        dataSituacao: companyData.dataSituacao || null,
        logradouro: companyData.logradouro || null,
        numero: companyData.numero || null,
        complemento: companyData.complemento || null,
        bairro: companyData.bairro || null,
        cep: companyData.cep || null,
        email: companyData.email || null,
        telefone: companyData.telefone || null,
        qsa: companyData.qsa ? (companyData.qsa as unknown as object) : undefined,
        atividadesSecundarias: companyData.atividadesSecundarias
          ? (companyData.atividadesSecundarias as unknown as object)
          : undefined,
        authorizedByUserId: userId,
      },
    })

    logger.info({ organizationId, cnpj, jobId: job.id }, '[Company Enrichment Worker] Complete')
  },
  {
    connection: getRedis(),
    concurrency: 5,
  }
)
