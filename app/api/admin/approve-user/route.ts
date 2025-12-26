import { NextRequest, NextResponse } from 'next/server';
import { approveUser } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/auth';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');
  return verifyAdminPassword(token);
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    await approveUser(userId);

    return NextResponse.json({
      success: true,
      message: 'User updated (approval no longer required)',
    });
  } catch (error: any) {
    console.error('[API] POST /api/admin/approve-user - Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve user', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


