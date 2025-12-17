import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    if (verifyAdminPassword(password)) {
      return NextResponse.json({
        success: true,
        message: 'Admin authentication successful',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('[API] POST /api/admin/auth - Error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


