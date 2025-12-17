import { NextRequest, NextResponse } from 'next/server';
import { getPendingApprovals } from '@/lib/db';
import { verifyAdminPassword, extractTokenFromHeader } from '@/lib/auth';

// Simple admin session check (in production, use proper session management)
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  
  // For simplicity, check if it's the admin password in header
  // In production, use proper session tokens
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

    const pendingUsers = await getPendingApprovals();
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


