import { NextRequest, NextResponse } from 'next/server';
import { checkUserExistsWithPassword, checkUserExistsWithoutPassword } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wing } = body;

    // Validate inputs
    if (!name || !wing) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wing' },
        { status: 400 }
      );
    }

    // Check if user exists with password
    const userWithPassword = await checkUserExistsWithPassword(name.trim(), wing.trim());
    if (userWithPassword) {
      return NextResponse.json({
        exists: true,
        hasPassword: true,
      });
    }

    // Check if user exists without password
    const userWithoutPassword = await checkUserExistsWithoutPassword(name.trim(), wing.trim());
    if (userWithoutPassword) {
      return NextResponse.json({
        exists: true,
        hasPassword: false,
      });
    }

    // User doesn't exist
    return NextResponse.json({
      exists: false,
      hasPassword: false,
    });
  } catch (error: any) {
    console.error('[API] POST /api/auth/check-user - Error:', error);
    return NextResponse.json(
      { error: 'Failed to check user', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


