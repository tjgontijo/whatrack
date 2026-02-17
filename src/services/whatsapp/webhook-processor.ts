// Note: db not directly used in processor, handlers manage database access
import { onboardingHandler } from './handlers/onboarding.handler';
import { messageHandler } from './handlers/message.handler';
import { historyHandler } from './handlers/history.handler';
import { stateSyncHandler } from './handlers/state-sync.handler';

/**
 * WhatsApp Webhook Processor
 * Chain of Responsibility pattern for handling different webhook event types
 */
export class WebhookProcessor {
  /**
   * Process webhook payload from Meta
   * Extracts event type and delegates to appropriate handler
   */
  async process(payload: any): Promise<void> {
    try {
      // Extract event type from webhook structure
      const eventType = this.extractEventType(payload);

      if (!eventType) {
        console.warn('[WebhookProcessor] No event type found in payload');
        return;
      }

      console.log(`[WebhookProcessor] Processing event: ${eventType}`);

      // Route to appropriate handler
      switch (eventType) {
        case 'PARTNER_ADDED':
        case 'PARTNER_REMOVED':
        case 'PARTNER_REINSTATED':
          await onboardingHandler(payload, eventType);
          break;

        case 'messages':
          await messageHandler(payload);
          break;

        case 'history':
          // ✅ PRD: WhatsApp History Sync - Import historical messages
          await historyHandler(payload);
          break;

        case 'smb_app_state_sync':
          // ✅ PRD: WhatsApp History Sync - Sync contacts from Business App
          await stateSyncHandler(payload);
          break;

        case 'statuses':
          // TODO: Handle message status updates (delivered, read, etc)
          console.log('[WebhookProcessor] Status updates not yet implemented');
          break;

        case 'message_template_status_update':
          // TODO: Handle template approvals
          console.log('[WebhookProcessor] Template updates not yet implemented');
          break;

        default:
          console.warn(`[WebhookProcessor] Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error('[WebhookProcessor] Error processing webhook', error);
      throw error; // Re-throw to mark as unprocessed for DLQ
    }
  }

  /**
   * Extract event type from webhook payload
   * Supports:
   * - account_update (onboarding: PARTNER_ADDED, PARTNER_REMOVED, PARTNER_REINSTATED)
   * - messages (incoming messages)
   * - statuses (delivery/read updates)
   * - message_template_status_update (template approvals)
   * - history (PRD: WhatsApp History Sync - coexistence mode)
   * - smb_app_state_sync (PRD: WhatsApp History Sync - contact sync)
   */
  private extractEventType(payload: any): string | null {
    console.log('[WebhookProcessor.extractEventType] Payload:', JSON.stringify(payload, null, 2));

    if (!payload?.entry?.[0]?.changes?.[0]) {
      console.warn('[WebhookProcessor.extractEventType] Missing entry/changes structure');
      return null;
    }

    const change = payload.entry[0].changes[0];
    const field = change.field;
    const value = change.value;

    console.log('[WebhookProcessor.extractEventType] Field:', field, 'Has value:', !!value);

    // Account update events (PARTNER_ADDED, PARTNER_REMOVED, etc)
    if (field === 'account_update') {
      console.log('[WebhookProcessor.extractEventType] Account update event:', value?.event);
      return value?.event || null;
    }

    // Message and status events
    if (
      field === 'messages' ||
      field === 'statuses' ||
      field === 'message_template_status_update' ||
      field === 'history' || // ✅ History sync webhook
      field === 'smb_app_state_sync' // ✅ Contact sync webhook
    ) {
      console.log('[WebhookProcessor.extractEventType] Found matching field:', field);
      return field;
    }

    console.warn('[WebhookProcessor.extractEventType] No matching field type');
    return null;
  }
}

export const webhookProcessor = new WebhookProcessor();
