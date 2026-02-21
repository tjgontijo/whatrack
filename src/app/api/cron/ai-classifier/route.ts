import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchAiEvent } from '@/services/ai/ai-execution.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    // Authorization check (Vercel Cron Secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // Only block if unauthorized in production. In dev allow manual calls.
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Define debouncing cooldowns
    const now = Date.now();
    const threeMinutesAgo = new Date(now - 3 * 60 * 1000);  // Buffer for "paused" conversation
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);   // Max lookback window to prevent analyzing old historical data

    try {
        // 1. Find eligible tickets
        const eligibleTickets = await prisma.ticket.findMany({
            where: {
                status: 'open',
                messagesCount: { gte: 4 }, // Need at least some conversation history to analyze
                conversation: {
                    lead: {
                        lastMessageAt: {
                            lte: threeMinutesAgo, // Has cooled down for at least 3 minutes
                            gte: twoHoursAgo     // Ignore very old tickets
                        }
                    }
                },
                // Ensure no recent insight classification exists
                NOT: {
                    aiInsights: {
                        some: {
                            createdAt: { gte: twoHoursAgo }
                        }
                    }
                }
            },
            // Fetch the organizationId along with ticketId
            select: { id: true, organizationId: true },
            take: 20 // Process in chunks to respect API limits
        });

        console.log(`[Cron AI Copilot] Found ${eligibleTickets.length} eligible tickets for IDLE analysis.`);

        let analyzed = 0;

        // Process them concurrently triggering the CONVERSATION_IDLE_3M event
        await Promise.allSettled(
            eligibleTickets.map(async (ticket) => {
                const generatedInsights = await dispatchAiEvent('CONVERSATION_IDLE_3M', ticket.id, ticket.organizationId);
                analyzed += generatedInsights;
            })
        );

        return NextResponse.json({
            success: true,
            found: eligibleTickets.length,
            approvalsCreated: analyzed,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`[Cron AI Copilot] Fatal error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
