import { NextRequest, NextResponse } from 'next/server';
import { getExerciseBasedLeaderboard } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wing = searchParams.get('wing') || null;

    const leaderboard = getExerciseBasedLeaderboard(wing);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching exercise-based leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise-based leaderboard' },
      { status: 500 }
    );
  }
}

