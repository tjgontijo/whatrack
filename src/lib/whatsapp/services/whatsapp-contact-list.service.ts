import { prisma } from '@/lib/db/prisma';
import { whatsappContactListSchema, WhatsAppContactList } from '../schemas/audience';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export async function listContactLists(organizationId: string) {
  return prisma.whatsAppContactList.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: { 
      _count: { 
        select: { members: true } 
      } 
    },
  });
}

export async function getContactListById(organizationId: string, listId: string) {
  const list = await prisma.whatsAppContactList.findFirst({
    where: { id: listId, organizationId },
    include: {
      _count: { select: { members: true } }
    }
  });

  if (!list) {
    return { error: 'Lista não encontrada', status: 404 as const };
  }

  return list;
}

export async function createContactList(organizationId: string, data: Partial<WhatsAppContactList>) {
  const validated = whatsappContactListSchema.parse({ ...data, organizationId });
  
  return prisma.whatsAppContactList.create({
    data: {
      organizationId,
      name: validated.name,
      description: validated.description ?? undefined,
    },
  });
}

export async function updateContactList(organizationId: string, listId: string, data: Partial<WhatsAppContactList>) {
  const existing = await prisma.whatsAppContactList.findFirst({
    where: { id: listId, organizationId },
  });

  if (!existing) {
    return { error: 'Lista não encontrada', status: 404 as const };
  }

  return prisma.whatsAppContactList.update({
    where: { id: listId },
    data: {
      name: data.name ?? undefined,
      description: data.description ?? undefined,
    },
  });
}

export async function deleteContactList(organizationId: string, listId: string) {
  const existing = await prisma.whatsAppContactList.findFirst({
    where: { id: listId, organizationId },
  });

  if (!existing) {
    return { error: 'Lista não encontrada', status: 404 as const };
  }

  await prisma.whatsAppContactList.delete({
    where: { id: listId },
  });

  return { success: true };
}

export async function listContactListMembers(organizationId: string, listId: string, page = 1, pageSize = 20) {
  const existing = await prisma.whatsAppContactList.findFirst({
    where: { id: listId, organizationId },
    select: { id: true }
  });

  if (!existing) {
    return { error: 'Lista não encontrada', status: 404 as const };
  }

  const [members, total] = await Promise.all([
    prisma.whatsAppContactListMember.findMany({
      where: { listId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.whatsAppContactListMember.count({ where: { listId } }),
  ]);

  return { items: members, total };
}

export async function addMemberToList(organizationId: string, listId: string, member: { phone: string, data?: any }) {
  const existingList = await prisma.whatsAppContactList.findFirst({
    where: { id: listId, organizationId },
  });

  if (!existingList) {
    return { error: 'Lista não encontrada', status: 404 as const };
  }

  const normalizedPhone = normalizePhone(member.phone);

  return prisma.whatsAppContactListMember.upsert({
    where: { 
      listId_normalizedPhone: {
        listId,
        normalizedPhone
      }
    },
    update: {
      phone: member.phone,
      data: member.data ?? undefined,
    },
    create: {
      listId,
      phone: member.phone,
      normalizedPhone,
      data: member.data ?? undefined,
    },
  });
}

export async function deleteMemberFromList(organizationId: string, listId: string, memberId: string) {
  const member = await prisma.whatsAppContactListMember.findFirst({
    where: { id: memberId, listId },
    include: { list: true }
  });

  if (!member || member.list.organizationId !== organizationId) {
    return { error: 'Membro ou Lista não encontrados', status: 404 as const };
  }

  await prisma.whatsAppContactListMember.delete({
    where: { id: memberId },
  });

  return { success: true };
}

export async function bulkImportMembers(organizationId: string, listId: string, members: Array<{ phone: string, data?: any }>) {
  const existingList = await prisma.whatsAppContactList.findFirst({
    where: { id: listId, organizationId },
    select: { id: true }
  });

  if (!existingList) {
    return { error: 'Lista não encontrada', status: 404 as const };
  }

  // To simplify bulk operations and handle thousands, we'll use a more advanced approach in a real app
  // but for the service implementation, we'll do it in a transaction.
  return prisma.$transaction(async (tx) => {
    let imported = 0;
    for (const member of members) {
      const normalizedPhone = normalizePhone(member.phone);
      if (!normalizedPhone) continue;

      await tx.whatsAppContactListMember.upsert({
        where: { 
          listId_normalizedPhone: {
             listId,
             normalizedPhone
          }
        },
        update: {
          phone: member.phone,
          data: member.data ?? undefined,
        },
        create: {
          listId,
          phone: member.phone,
          normalizedPhone,
          data: member.data ?? undefined,
        },
      });
      imported++;
    }
    return { imported };
  });
}
