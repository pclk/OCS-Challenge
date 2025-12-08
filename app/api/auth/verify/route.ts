import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, extractTokenFromHeader } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
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

    // Get user from database to ensure still exists and is approved
    const user = await getUserById(payload.userId);

    if (!user || (!user.approved && user.pendingApproval)) {
      return NextResponse.json(
        { error: 'User not found or not approved' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        wing: user.wing,
        approved: user.approved,
      },
    });
  } catch (error: any) {
    console.error('[API] GET /api/auth/verify - Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

