import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { attributionRulesService } from './attribution-rules.service'

export interface AnalyticsSettings {
  baseCurrency: string
  timezoneName: string
}

/**
 * Manages organization analytics configuration.
 * Ensures timezone and currency are validated and normalized.
 */
export class AnalyticsSettingsService {
  async getSettings(organizationId: string): Promise<AnalyticsSettings> {
    let settings = await prisma.organizationAnalyticsSettings.findUnique({
      where: { organizationId },
    })

    // Auto-create with defaults if missing
    if (!settings) {
      settings = await prisma.organizationAnalyticsSettings.create({
        data: {
          organizationId,
          baseCurrency: 'BRL',
          timezoneName: 'America/Sao_Paulo',
        },
      })
    }

    // Validate and normalize
    const normalized = {
      baseCurrency: attributionRulesService.normalizeCurrency(settings.baseCurrency),
      timezoneName: attributionRulesService.normalizeTimezone(settings.timezoneName),
    }

    // Update if changed
    if (
      normalized.baseCurrency !== settings.baseCurrency ||
      normalized.timezoneName !== settings.timezoneName
    ) {
      await prisma.organizationAnalyticsSettings.update({
        where: { organizationId },
        data: normalized,
      })
    }

    return normalized
  }

  async setSettings(
    organizationId: string,
    baseCurrency?: string,
    timezoneName?: string
  ) {
    const normalized = {
      baseCurrency: baseCurrency
        ? attributionRulesService.normalizeCurrency(baseCurrency)
        : undefined,
      timezoneName: timezoneName
        ? attributionRulesService.normalizeTimezone(timezoneName)
        : undefined,
    }

    return prisma.organizationAnalyticsSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        baseCurrency: normalized.baseCurrency || 'BRL',
        timezoneName: normalized.timezoneName || 'America/Sao_Paulo',
      },
      update: {
        ...(normalized.baseCurrency && { baseCurrency: normalized.baseCurrency }),
        ...(normalized.timezoneName && { timezoneName: normalized.timezoneName }),
      },
    })
  }
}

export const analyticsSettingsService = new AnalyticsSettingsService()
