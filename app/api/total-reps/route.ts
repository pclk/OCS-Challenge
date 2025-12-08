import { NextRequest, NextResponse } from 'next/server';
import { getTotalRepsLeaderboard } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const leaderboard = await getTotalRepsLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching total reps leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch total reps leaderboard' },
      { status: 500 }
    );
  }
}

