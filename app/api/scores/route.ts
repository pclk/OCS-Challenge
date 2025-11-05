import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, createScore, getExerciseById, getLeaderboard } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rank, name, wing, exerciseId, value } = body;

    // Validate input
    if (!rank || !name || !wing || !exerciseId || value === undefined || value === null) {
      return NextResponse.json(
        { error: 'Missing required fields: rank, name, wing, exerciseId, value' },
        { status: 400 }
      );
    }

    if (typeof value !== 'number' || value < 0) {
      return NextResponse.json(
        { error: 'Value must be a non-negative number' },
        { status: 400 }
      );
    }

    // Verify exercise exists
    const exercise = getExerciseById(exerciseId);
    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    // Get or create user
    const userId = getOrCreateUser(rank, name, wing);

    // Create score
    const result = createScore(userId, exerciseId, value);

    return NextResponse.json({
      success: true,
      scoreId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Error creating score:', error);
    return NextResponse.json(
      { error: 'Failed to create score' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exerciseId = searchParams.get('exerciseId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const wing = searchParams.get('wing') || null;

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'exerciseId query parameter is required' },
        { status: 400 }
      );
    }

    const exerciseIdNum = parseInt(exerciseId, 10);
    if (isNaN(exerciseIdNum)) {
      return NextResponse.json(
        { error: 'Invalid exerciseId' },
        { status: 400 }
      );
    }

    const leaderboard = getLeaderboard(exerciseIdNum, limit, wing);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

