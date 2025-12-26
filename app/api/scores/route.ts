import { NextRequest, NextResponse } from 'next/server';
import { createScore, createScores, getExerciseById, getLeaderboard, getUserById } from '@/lib/db';
import { verifySessionToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/scores - Request received');
    
    // Verify authentication token
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
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

    const body = await request.json();
    console.log('[API] POST /api/scores - Request body:', JSON.stringify(body, null, 2));
    
    // Support bulk scores submission (authenticated users)
    if (body.scores && Array.isArray(body.scores)) {
      const { scores } = body;
      
      console.log('[API] POST /api/scores - Bulk submission detected:', {
        userId: user.id,
        scoresCount: scores?.length,
        scores: scores?.slice(0, 3) // Log first 3 for debugging
      });
      
      if (!scores || scores.length === 0) {
        console.log('[API] POST /api/scores - Missing required fields');
        return NextResponse.json(
          { error: 'Missing required fields: scores' },
          { status: 400 }
        );
      }

      const userId = user.id;

      // Validate and filter scores (only include exercises with values)
      const validScores = scores
        .filter((s: any) => {
          if (!s.exerciseId || s.value === undefined || s.value === null || s.value === '') {
            return false;
          }
          const numValue = typeof s.value === 'string' ? parseInt(s.value, 10) : s.value;
          return !isNaN(numValue) && numValue >= 0;
        })
        .map((s: any) => ({
          userId,
          exerciseId: typeof s.exerciseId === 'string' ? parseInt(s.exerciseId, 10) : s.exerciseId,
          value: typeof s.value === 'string' ? parseInt(s.value, 10) : s.value,
        }));

      if (validScores.length === 0) {
        return NextResponse.json(
          { error: 'No valid scores to submit' },
          { status: 400 }
        );
      }

      // Verify all exercises exist
      for (const score of validScores) {
        const exercise = await getExerciseById(score.exerciseId);
        if (!exercise) {
          return NextResponse.json(
            { error: `Exercise with id ${score.exerciseId} not found` },
            { status: 404 }
          );
        }
      }

      // Create scores
      console.log('[API] POST /api/scores - About to create scores:', {
        userId,
        validScoresCount: validScores.length,
        validScores: validScores.slice(0, 3) // Log first 3 for debugging
      });
      try {
        await createScores(validScores);
        console.log('[API] POST /api/scores - Scores created successfully');
        return NextResponse.json({
          success: true,
          submitted: validScores.length,
        });
      } catch (error: any) {
        console.error('[API] POST /api/scores - Error creating scores:', {
          error: error?.message,
          code: error?.code,
          cause: error?.cause,
          stack: error?.stack?.split('\n').slice(0, 5)
        });
        // Provide more specific error message
        if (error.code === 'P2002') {
          return NextResponse.json(
            { error: 'A score for this exercise already exists. Each user can only have one score per exercise.' },
            { status: 400 }
          );
        }
        throw error; // Re-throw to be caught by outer catch
      }
    } else {
      // Single score submission (authenticated users)
      const { exerciseId, value } = body;

      // Validate input
      if (!exerciseId || value === undefined || value === null) {
        return NextResponse.json(
          { error: 'Missing required fields: exerciseId, value' },
          { status: 400 }
        );
      }

      const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
      if (isNaN(numValue) || numValue < 0) {
        return NextResponse.json(
          { error: 'Value must be a non-negative number' },
          { status: 400 }
        );
      }

      // Verify exercise exists
      const exercise = await getExerciseById(exerciseId);
      if (!exercise) {
        return NextResponse.json(
          { error: 'Exercise not found' },
          { status: 404 }
        );
      }

      // Use authenticated user
      const userId = user.id;

      // Create score
      await createScore(userId, exerciseId, numValue);

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error: any) {
    console.error('[API] POST /api/scores - Top-level error caught:', {
      error: error?.message,
      code: error?.code,
      cause: error?.cause,
      originalCode: error?.cause?.originalCode,
      originalMessage: error?.cause?.originalMessage,
      stack: error?.stack?.split('\n').slice(0, 10)
    });
    return NextResponse.json(
      { error: 'Failed to create score', details: error?.message || 'Unknown error' },
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

    const leaderboard = await getLeaderboard(exerciseIdNum, limit, wing);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

