import { NextRequest, NextResponse } from 'next/server';
import { deleteUserAccount, logAccountAction } from '@/lib/db';
import { verifySessionToken, extractTokenFromHeader } from '@/lib/auth';

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

    // Log account deletion before deleting
    await logAccountAction(
      payload.userId,
      payload.name,
      payload.wing,
      'account_deleted',
      { 
        timestamp: new Date().toISOString(),
        userId: payload.userId 
      }
    );

    // Delete the user account
    await deleteUserAccount(payload.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    console.error('[API] POST /api/user/delete-account - Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

