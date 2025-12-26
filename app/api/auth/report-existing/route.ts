import { NextRequest, NextResponse } from 'next/server';
import { getAdminLevel, getWingFromPassword } from '@/lib/auth';
import { createReport, getReports, deleteReport } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wing, password, email, phone, notes, type } = body;

    if (!name || !wing) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wing' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'ACCOUNT_CONFLICT' && type !== 'NEW_ACCOUNT_REQUEST')) {
      return NextResponse.json(
        { error: 'Missing or invalid type field. Must be ACCOUNT_CONFLICT or NEW_ACCOUNT_REQUEST' },
        { status: 400 }
      );
    }

    // Password is optional for reports about existing accounts
    if (password && password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    // Store report in database
    const report = await createReport({
      name,
      wing,
      password,
      type: type as 'ACCOUNT_CONFLICT' | 'NEW_ACCOUNT_REQUEST',
      email,
      phone,
      notes,
    });

    console.log('[API] POST /api/auth/report-existing - Report received:', {
      ...report,
      password: '***', // Don't log password
    });

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully. An admin will review it.',
    });
  } catch (error: any) {
    console.error('[API] POST /api/auth/report-existing - Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit report', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Optionally filter by wing if admin is wing-level
    const authHeader = request.headers.get('authorization');
    let wing: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const adminLevel = getAdminLevel(token);
      if (adminLevel === 'WING') {
        wing = getWingFromPassword(token);
      }
    }

    const reports = await getReports(wing);
    
    return NextResponse.json({
      reports: reports,
    });
  } catch (error: any) {
    console.error('[API] GET /api/auth/report-existing - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const adminLevel = getAdminLevel(token);
    if (adminLevel !== 'OCS' && adminLevel !== 'WING') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing reportId' },
        { status: 400 }
      );
    }

    // Convert string ID to number
    const id = parseInt(reportId, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid reportId' },
        { status: 400 }
      );
    }

    await deleteReport(id);

    return NextResponse.json({
      success: true,
      message: 'Report dismissed successfully',
    });
  } catch (error: any) {
    console.error('[API] DELETE /api/auth/report-existing - Error:', error);
    
    // Handle Prisma not found error
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to dismiss report', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

