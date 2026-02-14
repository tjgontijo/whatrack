import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('\n=== WHATSAPP CONFIGURATIONS ===');
    const configs = await prisma.whatsAppConfig.findMany({
        include: {
            organization: {
                select: { name: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    if (configs.length === 0) {
        console.log('No configurations found.');
    } else {
        configs.forEach(config => {
            const tokenPreview = config.accessToken
                ? `${config.accessToken.substring(0, 10)}...${config.accessToken.substring(config.accessToken.length - 10)}`
                : 'NULL';

            console.log(`
Org: ${config.organization.name} (${config.organizationId})
ID: ${config.id}
WABA ID: ${config.wabaId}
Phone ID: ${config.phoneId}
Phone: ${config.displayPhone}
Status: ${config.status}
Token: ${tokenPreview}
Token Expires: ${config.tokenExpiresAt ? config.tokenExpiresAt.toISOString() : 'Never/Permanent'}
Auth Code: ${config.authorizationCode ? 'PRESENT' : 'MISSING'}
Updated At: ${config.updatedAt.toISOString()}
-----------------------------------`);
        });
    }

    console.log('\n=== RECENT WEBHOOK LOGS (Last 10) ===');
    const logs = await prisma.whatsAppWebhookLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
            organization: {
                select: { name: true }
            }
        }
    });

    if (logs.length === 0) {
        console.log('No webhook logs found.');
    } else {
        logs.forEach(log => {
            console.log(`
Date: ${log.createdAt.toISOString()}
Org: ${log.organization?.name || 'Unknown'}
Type: ${log.eventType}
Payload Sample: ${JSON.stringify(log.payload).substring(0, 200)}...
-----------------------------------`);
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
