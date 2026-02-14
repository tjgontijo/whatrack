# Implementation Plan - WhatsApp Chat History (Read-Only)

This plan outlines the steps to implement the centralized WhatsApp Chat Inbox in "Read-Only" mode. We will focus on capturing incoming messages via webhooks and displaying them in a user-friendly interface.

## User Story
As an organization admin, I want to see a history of conversations exchanged on my registered WhatsApp numbers so that I can monitor interactions and ensure lead quality, even without being able to reply directly from the platform yet.

## Phase 1: Database & Backend Infrastructure

### Step 1.1: Database Schema Update
- [ ] Edit `prisma/schema.prisma` to add `Contact` and `Message` models.
- [ ] Run `npx prisma migrate dev --name add_whatsapp_chat_history` to apply changes.
- [ ] Verify types are generated.

### Step 1.2: Webhook Implementation
- [ ] Create/Update `/app/api/webhooks/whatsapp/route.ts`.
- [ ] Implement `GET` handler for Hub Challenge using the `verify_token` from `WhatsAppConfig`.
- [ ] Implement `POST` handler:
    - [ ] Validate `X-Hub-Signature-256`.
    - [ ] Process `messages` events.
    - [ ] Upsert `Contact` (Lead) based on `from` number.
    - [ ] Create `Message` record.
    - [ ] Handle `statuses` events (update message status).
- [ ] Create service `src/services/whatsapp-chat.service.ts` to handle DB logic cleanly.

## Phase 2: React Query & Frontend Helpers

### Step 2.1: API Endpoints
- [ ] Create `/app/api/whatsapp/chats/route.ts` (GET) to list contacts/conversations for an instance.
- [ ] Create `/app/api/whatsapp/chats/[contactId]/route.ts` (GET) to list messages for a specific contact.

### Step 2.2: Frontend Hooks
- [ ] Create `src/hooks/use-whatsapp-chat.ts`.
    - [ ] `useContacts(instanceId)`
    - [ ] `useMessages(contactId)`

## Phase 3: User Interface (Read-Only Inbox)

### Step 3.1: Components
- [ ] Create `src/components/whatsapp/inbox/chat-layout.tsx` (Main container).
- [ ] Create `src/components/whatsapp/inbox/sidebar.tsx` (Contact list).
- [ ] Create `src/components/whatsapp/inbox/chat-window.tsx` (Message view).
- [ ] Create `src/components/whatsapp/inbox/message-bubble.tsx` (Individual message styling).

### Step 3.2: Page Assembly
- [ ] Create page `/app/(dashboard)/dashboard/whatsapp/inbox/page.tsx`.
- [ ] Integrate components.
- [ ] Add "Read Only Mode" indicator/banner.

## Phase 4: Testing & Validation
- [ ] Verify webhook verification with Meta Graph API Explorer or local tunnel (ngrok).
- [ ] Send a message to the bot number and verify it appears in DB.
- [ ] Check if the UI updates (via polling or refresh).
