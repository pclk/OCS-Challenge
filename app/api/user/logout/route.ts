import { NextRequest, NextResponse } from 'next/server';
import { logAccountAction } from '@/lib/db';
import { verifySessionToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: true }, // Don't fail if no token, just return success
        { status: 200 }
      );
    }

    const payload = verifySessionToken(token);
    if (payload) {
      // Log logout action
      await logAccountAction(
        payload.userId,
        payload.name,
        payload.wing,
        'logout',
        { timestamp: new Date().toISOString() }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Logout logged',
    });
  } catch (error: any) {
    console.error('[API] POST /api/user/logout - Error:', error);
    // Don't fail logout if logging fails
    return NextResponse.json({
      success: true,
    });
  }
}

