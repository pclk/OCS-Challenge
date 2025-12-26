import { NextRequest, NextResponse } from 'next/server';
import { getAdminLevel, getWingFromPassword } from '@/lib/auth';
import { getReports } from '@/lib/db';

async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; wing?: string | null }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { isAdmin: false };
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  const wing = getWingFromPassword(token);
  if (adminLevel === 'OCS' || adminLevel === 'WING') {
    return { isAdmin: true, wing };
  }
  return { isAdmin: false };
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, wing: adminWing } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch reports directly from database
    // Wing admins only see reports from their wing
    const reports = await getReports(adminWing || null);
    
    return NextResponse.json({
      success: true,
      reports: reports,
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/reports - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


