import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkUserExistsWithoutPassword, checkUserExistsWithPassword, logAccountAction } from '@/lib/db';
import { generateSessionToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wing, password } = body;

    // Validate inputs
    if (!name || !wing) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wing' },
        { status: 400 }
      );
    }

    // Check if user exists but has no password
    const userWithoutPassword = await checkUserExistsWithoutPassword(name.trim(), wing.trim());
    if (userWithoutPassword) {
      return NextResponse.json({
        success: false,
        needsPassword: true,
        shouldRegister: true,
        user: {
          id: userWithoutPassword.id,
          name: userWithoutPassword.name,
          wing: userWithoutPassword.wing,
        },
        message: 'User exists but has no password. Please register to create a password.',
      });
    }

    // Check if user doesn't exist at all
    const userWithPassword = await checkUserExistsWithPassword(name.trim(), wing.trim());
    if (!userWithPassword) {
      return NextResponse.json({
        success: false,
        userNotFound: true,
        shouldRegister: true,
        message: 'User not found. Please register to create an account.',
      });
    }

    // If password provided, try to authenticate
    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const user = await authenticateUser(name.trim(), wing.trim(), password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate session token
    const token = generateSessionToken(user.id, user.name, user.wing);

    // Log login action
    await logAccountAction(
      user.id,
      user.name,
      user.wing,
      'login',
      { timestamp: new Date().toISOString() }
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        wing: user.wing,
      },
      token,
    });
  } catch (error: any) {
    console.error('[API] POST /api/auth/login - Error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate user', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

