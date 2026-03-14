#!/usr/bin/env npx ts-node

/**
 * PRD 32 Phase 3: Ownership Ambiguity Analysis Script
 *
 * Purpose: Analyze organizations and assets to determine:
 * - Which orgs can be auto-mapped (single project)
 * - Which orgs need manual review (multiple projects)
 * - Asset distribution across organizations
 *
 * Usage: npm run ts-node src/scripts/analyze-ownership-ambiguity.ts
 *
 * Output: Summary report with categorization and next steps
 */

import { prisma } from '@/lib/db/prisma'

interface OrgAnalysis {
  orgId: string
  orgName: string
  projectCount: number
  projectNames: string[]
  metaConnections: number
  metaAdAccounts: number
  metaPixels: number
  whatsappConfigs: number
  totalAssets: number
  mappingStrategy: 'AUTO_MAPPABLE' | 'MANUAL_MAPPING_REQUIRED'
}

interface AnalysisReport {
  timestamp: string
  totalOrganizations: number
  singleProjectOrgs: number
  multiProjectOrgs: number
  organizations: OrgAnalysis[]
  summary: {
    autoMappableCount: number
    manualMappingCount: number
    totalAssetsAwaitingMapping: number
    autoMappableAssets: {
      metaConnections: number
      metaAdAccounts: number
      metaPixels: number
      whatsappConfigs: number
    }
    manualMappingAssets: {
      metaConnections: number
      metaAdAccounts: number
      metaPixels: number
      whatsappConfigs: number
    }
  }
}

async function analyzeOrganizations(): Promise<AnalysisReport> {
  console.log('Starting ownership ambiguity analysis...\n')

  // Get all organizations with their projects
  const organizations = await prisma.organization.findMany({
    include: {
      projects: {
        select: { id: true, name: true },
      },
    },
  })

  console.log(`Found ${organizations.length} organizations\n`)

  const analyses: OrgAnalysis[] = []
  let totalAutoMappable = 0
  let totalManualMapping = 0

  let autoMappableMetaConnections = 0
  let autoMappableMetaAdAccounts = 0
  let autoMappableMetaPixels = 0
  let autoMappableWhatsAppConfigs = 0

  let manualMappingMetaConnections = 0
  let manualMappingMetaAdAccounts = 0
  let manualMappingMetaPixels = 0
  let manualMappingWhatsAppConfigs = 0

  for (const org of organizations) {
    const projectCount = org.projects.length

    // Get asset counts for this organization
    const [metaConnectionCount, metaAdAccountCount, metaPixelCount, whatsappConfigCount] =
      await Promise.all([
        prisma.metaConnection.count({
          where: { organizationId: org.id },
        }),
        prisma.metaAdAccount.count({
          where: { organizationId: org.id },
        }),
        prisma.metaPixel.count({
          where: { organizationId: org.id },
        }),
        prisma.whatsAppConfig.count({
          where: { organizationId: org.id },
        }),
      ])

    const totalAssets = metaConnectionCount + metaAdAccountCount + metaPixelCount + whatsappConfigCount

    // Determine mapping strategy
    const mappingStrategy: 'AUTO_MAPPABLE' | 'MANUAL_MAPPING_REQUIRED' =
      projectCount === 1 ? 'AUTO_MAPPABLE' : 'MANUAL_MAPPING_REQUIRED'

    const analysis: OrgAnalysis = {
      orgId: org.id,
      orgName: org.name,
      projectCount,
      projectNames: org.projects.map((p) => p.name),
      metaConnections: metaConnectionCount,
      metaAdAccounts: metaAdAccountCount,
      metaPixels: metaPixelCount,
      whatsappConfigs: whatsappConfigCount,
      totalAssets,
      mappingStrategy,
    }

    analyses.push(analysis)

    // Aggregate counts
    if (mappingStrategy === 'AUTO_MAPPABLE') {
      totalAutoMappable++
      autoMappableMetaConnections += metaConnectionCount
      autoMappableMetaAdAccounts += metaAdAccountCount
      autoMappableMetaPixels += metaPixelCount
      autoMappableWhatsAppConfigs += whatsappConfigCount
    } else {
      totalManualMapping++
      manualMappingMetaConnections += metaConnectionCount
      manualMappingMetaAdAccounts += metaAdAccountCount
      manualMappingMetaPixels += metaPixelCount
      manualMappingWhatsAppConfigs += whatsappConfigCount
    }
  }

  // Sort by total assets (descending) for visibility
  analyses.sort((a, b) => b.totalAssets - a.totalAssets)

  const report: AnalysisReport = {
    timestamp: new Date().toISOString(),
    totalOrganizations: organizations.length,
    singleProjectOrgs: totalAutoMappable,
    multiProjectOrgs: totalManualMapping,
    organizations: analyses,
    summary: {
      autoMappableCount: totalAutoMappable,
      manualMappingCount: totalManualMapping,
      totalAssetsAwaitingMapping:
        autoMappableMetaConnections +
        autoMappableMetaAdAccounts +
        autoMappableMetaPixels +
        autoMappableWhatsAppConfigs +
        manualMappingMetaConnections +
        manualMappingMetaAdAccounts +
        manualMappingMetaPixels +
        manualMappingWhatsAppConfigs,
      autoMappableAssets: {
        metaConnections: autoMappableMetaConnections,
        metaAdAccounts: autoMappableMetaAdAccounts,
        metaPixels: autoMappableMetaPixels,
        whatsappConfigs: autoMappableWhatsAppConfigs,
      },
      manualMappingAssets: {
        metaConnections: manualMappingMetaConnections,
        metaAdAccounts: manualMappingMetaAdAccounts,
        metaPixels: manualMappingMetaPixels,
        whatsappConfigs: manualMappingWhatsAppConfigs,
      },
    },
  }

  return report
}

function formatReport(report: AnalysisReport): string {
  const lines: string[] = []

  lines.push('═'.repeat(60))
  lines.push('PRD 32 Phase 3: Ownership Ambiguity Analysis')
  lines.push('═'.repeat(60))
  lines.push('')
  lines.push(`Report Generated: ${new Date(report.timestamp).toLocaleString()}`)
  lines.push('')

  // High-level summary
  lines.push('╔' + '═'.repeat(58) + '╗')
  lines.push('║ SUMMARY' + ' '.repeat(51) + '║')
  lines.push('╠' + '═'.repeat(58) + '╣')
  lines.push(`║ Total Organizations: ${report.totalOrganizations.toString().padEnd(38)} ║`)
  lines.push(`║ Auto-Mappable (1 project): ${report.summary.autoMappableCount.toString().padEnd(32)} ║`)
  lines.push(`║ Manual Mapping (2+ projects): ${report.summary.manualMappingCount.toString().padEnd(30)} ║`)
  lines.push(`║ Total Assets Awaiting Mapping: ${report.summary.totalAssetsAwaitingMapping.toString().padEnd(28)} ║`)
  lines.push('╚' + '═'.repeat(58) + '╝')
  lines.push('')

  // Auto-mappable breakdown
  lines.push('AUTO-MAPPABLE ORGANIZATIONS')
  lines.push('(These can be auto-mapped to their single project)')
  lines.push('─'.repeat(60))

  const autoMappableAssets = report.summary.autoMappableAssets
  lines.push(`Meta Connections: ${autoMappableAssets.metaConnections}`)
  lines.push(`Meta Ad Accounts: ${autoMappableAssets.metaAdAccounts}`)
  lines.push(`Meta Pixels: ${autoMappableAssets.metaPixels}`)
  lines.push(`WhatsApp Configs: ${autoMappableAssets.whatsappConfigs}`)
  lines.push(`Total: ${autoMappableAssets.metaConnections + autoMappableAssets.metaAdAccounts + autoMappableAssets.metaPixels + autoMappableAssets.whatsappConfigs}`)
  lines.push('')

  // Manual mapping breakdown
  lines.push('MANUAL MAPPING REQUIRED')
  lines.push('(These organizations have multiple projects - review needed)')
  lines.push('─'.repeat(60))

  const manualAssets = report.summary.manualMappingAssets
  lines.push(`Meta Connections: ${manualAssets.metaConnections}`)
  lines.push(`Meta Ad Accounts: ${manualAssets.metaAdAccounts}`)
  lines.push(`Meta Pixels: ${manualAssets.metaPixels}`)
  lines.push(`WhatsApp Configs: ${manualAssets.whatsappConfigs}`)
  lines.push(
    `Total: ${manualAssets.metaConnections + manualAssets.metaAdAccounts + manualAssets.metaPixels + manualAssets.whatsappConfigs}`
  )
  lines.push('')

  // Detailed organization list
  lines.push('═'.repeat(60))
  lines.push('DETAILED ORGANIZATION ANALYSIS')
  lines.push('═'.repeat(60))
  lines.push('')

  // Filter for display
  const autoMapOrgs = report.organizations.filter((o) => o.mappingStrategy === 'AUTO_MAPPABLE')
  const manualOrgs = report.organizations.filter((o) => o.mappingStrategy === 'MANUAL_MAPPING_REQUIRED')

  // Show auto-mappable organizations (brief)
  if (autoMapOrgs.length > 0) {
    lines.push(`✓ AUTO-MAPPABLE (${autoMapOrgs.length})`)
    lines.push('─'.repeat(60))

    for (const org of autoMapOrgs) {
      if (org.totalAssets > 0) {
        lines.push(
          `${org.orgName} (${org.orgId.slice(0, 8)}...) → Project: ${org.projectNames[0]}`
        )
        lines.push(
          `  Assets: ${org.metaConnections} connections, ${org.metaAdAccounts} ad accounts, ${org.metaPixels} pixels, ${org.whatsappConfigs} phone(s)`
        )
      }
    }
    lines.push('')
  }

  // Show manual mapping organizations (detailed)
  if (manualOrgs.length > 0) {
    lines.push(`⚠ MANUAL MAPPING REQUIRED (${manualOrgs.length})`)
    lines.push('─'.repeat(60))

    for (const org of manualOrgs) {
      lines.push('')
      lines.push(`Org: "${org.orgName}"`)
      lines.push(`ID: ${org.orgId}`)
      lines.push(`Projects: ${org.projectCount} projects`)
      for (const projectName of org.projectNames) {
        lines.push(`  • ${projectName}`)
      }
      lines.push(`Assets Needing Mapping:`)
      lines.push(`  • ${org.metaConnections} Meta Connection(s)`)
      lines.push(`  • ${org.metaAdAccounts} Meta Ad Account(s)`)
      lines.push(`  • ${org.metaPixels} Meta Pixel(s)`)
      lines.push(`  • ${org.whatsappConfigs} WhatsApp Config(s)`)
      lines.push(`Action: MANUAL REVIEW REQUIRED - Use business logic or customer input`)
    }
    lines.push('')
  }

  // Next steps
  lines.push('═'.repeat(60))
  lines.push('NEXT STEPS')
  lines.push('═'.repeat(60))
  lines.push('')
  lines.push('1. RUN AUTO-MAPPING for single-project organizations')
  lines.push('   See: docs/PRD/32_BACKFILL_STRATEGY.md → Strategy A')
  lines.push('')
  lines.push('2. MANUAL REVIEW for multi-project organizations')
  lines.push('   See: docs/PRD/32_BACKFILL_STRATEGY.md → Strategy B')
  lines.push('')
  lines.push('3. VALIDATE backfill is complete')
  lines.push('   All NULL projectIds should be 0')
  lines.push('')
  lines.push('═'.repeat(60))

  return lines.join('\n')
}

async function main() {
  try {
    const report = await analyzeOrganizations()
    const formattedReport = formatReport(report)
    console.log(formattedReport)

    // Return exit code based on presence of manual mapping requirements
    const exitCode = report.summary.manualMappingCount > 0 ? 1 : 0
    if (exitCode === 1) {
      console.log('\n⚠ Manual mapping required. Review organizations above and complete mapping.')
    } else {
      console.log('\n✓ All organizations are auto-mappable. Ready to proceed with backfill.')
    }

    process.exit(exitCode)
  } catch (error) {
    console.error('Error during analysis:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
