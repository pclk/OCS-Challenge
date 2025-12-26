import { NextRequest, NextResponse } from 'next/server';
import { registerUser, checkUserExistsWithPassword } from '@/lib/db';
import { generateSessionToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wing, password } = body;

    // Validate inputs
    if (!name || !wing || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wing, password' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    // Check if user exists with password
    const userWithPassword = await checkUserExistsWithPassword(name.trim(), wing.trim());
    if (userWithPassword) {
      return NextResponse.json({
        success: false,
        shouldLogin: true,
        user: {
          id: userWithPassword.id,
          name: userWithPassword.name,
          wing: userWithPassword.wing,
        },
        message: 'An account with this name and wing already exists. Please login instead.',
      });
    }

    // Register user
    try {
      const user = await registerUser(name.trim(), wing.trim(), password);

      // Generate session token
      const token = generateSessionToken(user.id, user.name, user.wing);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          wing: user.wing,
        },
        token,
        message: 'Account created successfully!',
      });
    } catch (error: any) {
      if (error.message === 'User already exists') {
        return NextResponse.json(
          { error: 'An account with this name and wing already exists. Please login instead.' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('[API] POST /api/auth/register - Error:', error);
    return NextResponse.json(
      { error: 'Failed to register user', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

