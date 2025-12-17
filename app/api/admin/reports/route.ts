import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/auth';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');
  return verifyAdminPassword(token);
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const isAdmin = await verifyAdmin(request);
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
      return NextResponse.json({
        success: true,
        reports: data.reports || [],
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


