import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFullAccess } from '@/server/auth/validate-organization-access';

export async function GET(request: NextRequest) {
    try {
        const access = await validateFullAccess(request);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'SUGGESTION';

        const insights = await prisma.aiInsight.findMany({
            where: {
                organizationId: access.organizationId,
                status,
                ticket: {
                    status: 'open', // We generally only want to see pending approvals for tickets that are still open.
                }
            },
            include: {
                agent: {
                    select: { name: true, icon: true }
                },
                ticket: {
                    include: {
                        conversation: {
                            include: {
                                lead: {
                                    select: { name: true, phone: true, profilePicUrl: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ items: insights });
    } catch (error) {
        console.error('[GET ai-insights] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
