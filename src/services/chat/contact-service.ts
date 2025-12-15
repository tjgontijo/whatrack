/**
 * Contact Service (Legacy - using Lead model)
 *
 * Handles Lead operations for chat (Contact model was replaced by Lead)
 */

import { prisma } from "@/lib/prisma";

interface FindOrCreateContactInput {
  organizationId: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

/**
 * Find or create a lead by phone number (replaces Contact model)
 */
export async function findOrCreateContact(input: FindOrCreateContactInput) {
  const { organizationId, phone, name, email, avatarUrl } = input;

  // Try to find existing lead by phone
  const existing = await prisma.lead.findFirst({
    where: {
      organizationId,
      phone,
    },
  });

  if (existing) {
    // Update name if provided and different
    if (name && name !== existing.name) {
      return await prisma.lead.update({
        where: { id: existing.id },
        data: { name },
      });
    }
    return existing;
  }

  // Create new lead
  return await prisma.lead.create({
    data: {
      organizationId,
      phone,
      name,
      mail: email,
    },
  });
}

/**
 * Stub for ContactChannel (no longer used - conversations handle this)
 */
export async function findOrCreateContactChannel(input: any) {
  console.warn('[findOrCreateContactChannel] ContactChannel model no longer exists, using Conversation instead');
  return null;
}
