import { NextRequest, NextResponse } from 'next/server';
import { validateFullAccess } from '@/server/auth/validate-organization-access';
import { hasPermission } from '@/lib/auth/rbac/roles';
import { getLeadActivity } from '@/services/analytics';

export async function GET(req: NextRequest) {
    try {
        const access = await validateFullAccess(req);
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasPermission(access.role, 'view:analytics')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await getLeadActivity(access.organizationId);
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Analytics Lead-Activity API] GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
