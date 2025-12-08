import { NextRequest, NextResponse } from 'next/server';
import { setUserPassword } from '@/lib/db';
import { generateSessionToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password, confirmPassword } = body;

    // Validate inputs
    if (!userId || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, password, confirmPassword' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Set password and auto-approve
    const user = await setUserPassword(userId, password);

    // Generate session token
    const token = generateSessionToken(user.id, user.name, user.wing);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        wing: user.wing,
        approved: user.approved,
      },
      token,
      message: 'Password created successfully! You are now logged in.',
    });
  } catch (error: any) {
    console.error('[API] POST /api/auth/set-password - Error:', error);
    return NextResponse.json(
      { error: 'Failed to set password', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

