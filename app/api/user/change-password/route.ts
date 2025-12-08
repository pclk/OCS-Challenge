import { NextRequest, NextResponse } from 'next/server';
import { updateUser, logAccountAction, getUserById } from '@/lib/db';
import { verifySessionToken, extractTokenFromHeader, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    // Get user from database to verify current password
    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the user's current password hash from database
    const userResult = await prisma.$queryRaw<Array<{
      password: string | null;
    }>>`
      SELECT password
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (userResult.length === 0 || !userResult[0].password) {
      return NextResponse.json(
        { error: 'User has no password set. Please contact admin.' },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = verifyPassword(currentPassword, userResult[0].password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password
    await updateUser(payload.userId, { password: newPassword });

    // Log password change action
    await logAccountAction(
      payload.userId,
      payload.name,
      payload.wing,
      'password_changed',
      { 
        timestamp: new Date().toISOString(),
        userId: payload.userId 
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('[API] POST /api/user/change-password - Error:', error);
    return NextResponse.json(
      { error: 'Failed to change password', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

