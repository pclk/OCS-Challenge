import { NextRequest, NextResponse } from 'next/server';
import { getUsersWithConflicts, resolveConflictByMerge } from '@/lib/db';
import { getAdminLevel } from '@/lib/auth';

async function verifyWingAdmin(request: NextRequest): Promise<{ isAdmin: boolean; wing?: string }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { isAdmin: false };
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  
  // For now, wing admins can access all conflicts
  // In the future, we can add wing-specific filtering
  if (adminLevel === 'WING' || adminLevel === 'OCS') {
    return { isAdmin: true };
  }
  
  return { isAdmin: false };
}

// Get users with conflicts
export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await verifyWingAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Wing admin access required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const wing = url.searchParams.get('wing') || undefined;

    const conflicts = await getUsersWithConflicts(wing);
    return NextResponse.json({
      success: true,
      conflicts: conflicts.map(c => ({
        id: c.id,
        name: c.name,
        wing: c.wing,
        createdAt: c.createdAt,
        conflictCount: c.conflictCount,
      })),
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/conflicts - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflicts', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Resolve a conflict
export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await verifyWingAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Wing admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, targetUserId, sourceUserId } = body;

    if (action === 'merge') {
      if (!targetUserId || !sourceUserId) {
        return NextResponse.json(
          { error: 'targetUserId and sourceUserId are required for merge action' },
          { status: 400 }
        );
      }

      if (targetUserId === sourceUserId) {
        return NextResponse.json(
          { error: 'Cannot merge user with itself' },
          { status: 400 }
        );
      }

      const result = await resolveConflictByMerge(targetUserId, sourceUserId);
      return NextResponse.json({
        success: true,
        message: 'Conflict resolved successfully',
        user: result,
      });
    } else if (action === 'delete') {
      if (!sourceUserId) {
        return NextResponse.json(
          { error: 'sourceUserId is required for delete action' },
          { status: 400 }
        );
      }

      // Delete user (using existing rejectUser function)
      const { rejectUser } = await import('@/lib/db');
      await rejectUser(sourceUserId);
      
      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "merge" or "delete"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[API] POST /api/admin/conflicts - Error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conflict', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



