import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, getAdminLevel, getWingFromPassword } from '@/lib/auth';

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

    // Fetch reports from the report-existing endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/report-existing`);
      const data = await response.json();
      const allReports = data.reports || [];
      
      // Filter by wing if wing admin
      let filteredReports = allReports;
      if (adminWing) {
        filteredReports = allReports.filter((r: any) => {
          const reportWing = (r.wing || '').trim();
          return reportWing.toLowerCase() === adminWing.toLowerCase();
        });
      }
      
      return NextResponse.json({
        success: true,
        reports: filteredReports,
      });
    } catch (error) {
      // If fetch fails, return empty array
      return NextResponse.json({
        success: true,
        reports: [],
      });
    }
  } catch (error: any) {
    console.error('[API] GET /api/admin/reports - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


