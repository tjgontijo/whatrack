// Note: db not directly used in processor, handlers manage database access
import { onboardingHandler } from './handlers/onboarding.handler';
import { messageHandler } from './handlers/message.handler';

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
   * Supports both account_update (onboarding) and messages events
   */
  private extractEventType(payload: any): string | null {
    if (!payload?.entry?.[0]?.changes?.[0]) {
      return null;
    }

    const change = payload.entry[0].changes[0];
    const field = change.field;
    const value = change.value;

    // Account update events (PARTNER_ADDED, PARTNER_REMOVED, etc)
    if (field === 'account_update') {
      return value?.event || null;
    }

    // Message and status events
    if (field === 'messages' || field === 'statuses' || field === 'message_template_status_update') {
      return field;
    }

    return null;
  }
}

export const webhookProcessor = new WebhookProcessor();
