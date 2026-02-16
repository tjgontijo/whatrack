import { prisma } from '@/lib/prisma';

/**
 * State Sync Handler - PRD: WhatsApp History Sync
 * Handles smb_app_state_sync webhooks from Meta (coexistence mode)
 *
 * CRITICAL:
 * - Creates/updates Leads with source='state_sync'
 * - ❌ NEVER creates Tickets
 * - Handles contact add/update/delete actions
 *
 * Flow:
 * 1. Extract state_sync contacts from webhook
 * 2. For each contact:
 *    - If action=add|update: upsert Lead (source='state_sync')
 *    - If action=delete: mark Lead as inactive
 */

export async function stateSyncHandler(payload: any): Promise<void> {
  const metadata = payload.metadata;
  const phoneNumberId = metadata?.phone_number_id;

  if (!phoneNumberId) {
    throw new Error('Invalid payload: missing phone_number_id');
  }

  // Find WhatsAppConfig by phoneNumberId
  const config = await prisma.whatsAppConfig.findUnique({
    where: { phoneId: phoneNumberId },
    include: { organization: true },
  });

  if (!config) {
    throw new Error(`WhatsAppConfig not found for phoneId: ${phoneNumberId}`);
  }

  console.log('[StateSyncHandler] Processing state sync webhook');

  const stateSync = payload.state_sync || [];
  if (!Array.isArray(stateSync) || stateSync.length === 0) {
    console.warn('[StateSyncHandler] No state_sync data found in payload');
    return;
  }

  let contactsAdded = 0;
  let contactsUpdated = 0;
  let contactsDeleted = 0;

  for (const item of stateSync) {
    try {
      const action = item.action; // 'add' | 'update' | 'delete'
      const contactData = item.contact || {};

      if (item.type !== 'contact') {
        console.log(`[StateSyncHandler] Skipping non-contact item: ${item.type}`);
        continue;
      }

      const waId = contactData.wa_id || contactData.phone_number;
      const fullName = contactData.full_name;
      const firstName = contactData.first_name;
      const displayName = fullName || firstName || 'Unknown';

      if (!waId) {
        console.warn('[StateSyncHandler] Contact missing wa_id/phone_number');
        continue;
      }

      // Normalize phone number
      const normalizedPhone = waId.startsWith('+') ? waId : `+${waId}`;

      if (action === 'add' || action === 'update') {
        // UPSERT Lead with source='state_sync'
        const lead = await prisma.lead.upsert({
          where: {
            organizationId_waId: {
              organizationId: config.organizationId,
              waId,
            },
          },
          create: {
            organizationId: config.organizationId,
            waId,
            phone: normalizedPhone,
            pushName: displayName,
            source: 'state_sync', // ✅ Mark as state sync source
            lastSyncedAt: new Date(),
            isActive: true,
          },
          update: {
            pushName: displayName,
            lastSyncedAt: new Date(),
            isActive: true,
            deletedAt: null, // Reactivate if was deleted
          },
        });

        if (action === 'add') {
          contactsAdded++;
          console.log(`[StateSyncHandler] Contact added: ${lead.id}`);
        } else {
          contactsUpdated++;
          console.log(`[StateSyncHandler] Contact updated: ${lead.id}`);
        }
      } else if (action === 'delete') {
        // Mark Lead as inactive/deleted
        const lead = await prisma.lead.findFirst({
          where: {
            organizationId: config.organizationId,
            OR: [{ waId }, { phone: normalizedPhone }],
          },
        });

        if (lead) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              isActive: false,
              deletedAt: new Date(),
            },
          });

          contactsDeleted++;
          console.log(`[StateSyncHandler] Contact deleted/deactivated: ${lead.id}`);
        }
      }
    } catch (error) {
      console.error('[StateSyncHandler] Error processing state sync item', error);
      // Continue with next item instead of failing
    }
  }

  // Update lastWebhookAt on config
  await prisma.whatsAppConfig.update({
    where: { id: config.id },
    data: {
      lastWebhookAt: new Date(),
      // Mark status as pending_history if first state sync
      ...(config.historySyncStatus === 'pending_consent' && {
        historySyncStatus: 'pending_history',
        historySyncStartedAt: new Date(),
      }),
    },
  });

  console.log(
    `[StateSyncHandler] Completed: added=${contactsAdded}, ` +
    `updated=${contactsUpdated}, deleted=${contactsDeleted}`
  );
}
