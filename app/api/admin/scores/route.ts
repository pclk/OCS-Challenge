import { NextRequest, NextResponse } from 'next/server';
import { deleteScore, getUserScoresTimeline, getScoresByWing } from '@/lib/db';
import { getAdminLevel, getWingFromPassword } from '@/lib/auth';

async function verifyWingAdmin(request: NextRequest): Promise<{ isAdmin: boolean; wing?: string | null }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { isAdmin: false };
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  if (adminLevel === 'WING' || adminLevel === 'OCS') {
    const wing = getWingFromPassword(token);
    return { isAdmin: true, wing };
  }
  return { isAdmin: false };
}

// Delete a score
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin, wing } = await verifyWingAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Wing admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { scoreId } = body;

    if (!scoreId) {
      return NextResponse.json(
        { error: 'scoreId is required' },
        { status: 400 }
      );
    }

    // For wing admins, verify the score belongs to their wing
    if (wing) {
      const { getUserScoresTimeline } = await import('@/lib/db');
      // Get the score's user info to verify wing
      const allUserScores = await getUserScoresTimeline(0); // We'll need to get score differently
      // Actually, let's get the score directly with user info
      const { prisma } = await import('@/lib/prisma');
      const score = await prisma.score.findUnique({
        where: { id: scoreId },
        include: { user: true },
      });
      
      if (!score) {
        return NextResponse.json(
          { error: 'Score not found' },
          { status: 404 }
        );
      }

      if (score.user.wing !== wing) {
        return NextResponse.json(
          { error: 'Unauthorized - Score does not belong to your wing' },
          { status: 403 }
        );
      }
    }

    await deleteScore(scoreId);
    
    return NextResponse.json({
      success: true,
      message: 'Score deleted successfully',
    });
  } catch (error: any) {
    console.error('[API] DELETE /api/admin/scores - Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete score', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get scores - supports both userId (for timeline) and wing (for admin panel)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const wing = searchParams.get('wing');

    // If wing is provided, fetch all scores for that wing (more efficient)
    if (wing) {
      const { isAdmin, wing: adminWing } = await verifyWingAdmin(request);
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // For wing admins, ensure they can only access their own wing
      const targetWing = adminWing || wing;
      const scores = await getScoresByWing(targetWing);
      
      return NextResponse.json({
        success: true,
        scores,
      });
    }

    // Otherwise, fetch by userId (for timeline view)
    if (!userId) {
      return NextResponse.json(
        { error: 'userId or wing is required' },
        { status: 400 }
      );
    }

    const scores = await getUserScoresTimeline(parseInt(userId, 10));
    
    return NextResponse.json({
      success: true,
      scores,
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/scores - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scores', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

