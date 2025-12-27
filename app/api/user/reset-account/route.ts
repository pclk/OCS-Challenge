import { NextRequest, NextResponse } from 'next/server';
import { resetUser, logAccountAction } from '@/lib/db';
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

    // Log account reset before resetting
    await logAccountAction(
      payload.userId,
      payload.name,
      payload.wing,
      'account_reset',
      { 
        timestamp: new Date().toISOString(),
        userId: payload.userId 
      }
    );

    // Reset the user account (removes password and scores, keeps account)
    await resetUser(payload.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Account reset successfully',
    });
  } catch (error: any) {
    console.error('[API] POST /api/user/reset-account - Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset account', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



