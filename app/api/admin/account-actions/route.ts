import { NextRequest, NextResponse } from 'next/server';
import { getAccountActions } from '@/lib/db';
import { getAdminLevel } from '@/lib/auth';

async function verifyOCSAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  return adminLevel === 'OCS';
}

// Get all account actions (with pagination)
export async function GET(request: NextRequest) {
  try {
    // Verify OCS admin access (only OCS can view account logs)
    const isOCSAdmin = await verifyOCSAdmin(request);
    if (!isOCSAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - OCS admin access required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);

    const result = await getAccountActions(limit, page);
    return NextResponse.json({
      success: true,
      actions: result.actions,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/account-actions - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account actions', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


