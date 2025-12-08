import { NextRequest, NextResponse } from 'next/server';
import { getAccountActions } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/auth';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');
  return verifyAdminPassword(token);
}

// Get all account actions
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const actions = await getAccountActions(limit);
    return NextResponse.json({
      success: true,
      actions,
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/account-actions - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account actions', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

