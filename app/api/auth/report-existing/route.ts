import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for reports (in production, use database)
const reports: Array<{
  id: string;
  name: string;
  wing: string;
  password: string;
  email?: string;
  phone?: string;
  notes?: string;
  timestamp: number;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wing, password, email, phone, notes } = body;

    if (!name || !wing) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wing' },
        { status: 400 }
      );
    }

    // Password is optional for reports about existing accounts
    if (password && password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    // Store report
    const report = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      name: name.trim(),
      wing: wing.trim(),
      password: password?.trim() || '', // Optional - In production, hash this before storing if provided
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      notes: notes?.trim() || '',
      timestamp: Date.now(),
    };

    reports.push(report);

    // Keep only last 100 reports
    if (reports.length > 100) {
      reports.shift();
    }

    console.log('[API] POST /api/auth/report-existing - Report received:', {
      ...report,
      password: '***', // Don't log password
    });

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully. An admin will review it.',
    });
  } catch (error: any) {
    console.error('[API] POST /api/auth/report-existing - Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit report', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return reports (for admin use)
  return NextResponse.json({
    reports: reports.sort((a, b) => b.timestamp - a.timestamp),
  });
}

