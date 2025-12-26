import { NextRequest, NextResponse } from 'next/server';
import { getPendingApprovals } from '@/lib/db';
import { getAdminLevel } from '@/lib/auth';

async function verifyWingAdmin(request: NextRequest): Promise<{ isAdmin: boolean; wing?: string }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { isAdmin: false };
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  
  if (adminLevel === 'WING' || adminLevel === 'OCS') {
    // For now, wing admins can see all pending approvals
    // In the future, we can filter by the admin's assigned wing
    return { isAdmin: true };
  }
  
  return { isAdmin: false };
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, wing } = await verifyWingAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Wing admin access required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const wingFilter = url.searchParams.get('wing') || wing;

    const pendingUsers = await getPendingApprovals(wingFilter);
    return NextResponse.json({
      success: true,
      users: pendingUsers,
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/pending-approvals - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


