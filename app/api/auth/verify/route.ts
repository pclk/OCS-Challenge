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

    // Get user from database to ensure still exists
    const user = await getUserById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Check if password was changed after token was issued
    // If passwordChangedAt exists and is after token timestamp, token is invalid
    if (user.passwordChangedAt && payload.timestamp) {
      const passwordChangedTime = new Date(user.passwordChangedAt).getTime();
      if (passwordChangedTime > payload.timestamp) {
        return NextResponse.json(
          { error: 'Token invalidated - password was changed' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        wing: user.wing,
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


