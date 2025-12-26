import { NextRequest, NextResponse } from 'next/server';
import { getExercises, createExercise, updateExercise, deleteExercise } from '@/lib/db';
import { getAdminLevel } from '@/lib/auth';
import { ExerciseType } from '@prisma/client';

async function verifyOCSAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  return adminLevel === 'OCS';
}

// Get all exercises
export async function GET(request: NextRequest) {
  try {
    const isOCSAdmin = await verifyOCSAdmin(request);
    if (!isOCSAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - OCS admin access required' },
        { status: 401 }
      );
    }

    const exercises = await getExercises();
    return NextResponse.json({
      success: true,
      exercises: exercises.map(e => ({ id: e.id, name: e.name, type: e.type })),
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/exercises - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create a new exercise
export async function POST(request: NextRequest) {
  try {
    const isOCSAdmin = await verifyOCSAdmin(request);
    if (!isOCSAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - OCS admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, type } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const exercise = await createExercise(name, 'rep');
    return NextResponse.json({
      success: true,
      exercise: { id: exercise.id, name: exercise.name, type: exercise.type },
      message: 'Exercise created successfully',
    });
  } catch (error: any) {
    console.error('[API] POST /api/admin/exercises - Error:', error);
    
    // Handle unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Exercise with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create exercise', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update an exercise
export async function PUT(request: NextRequest) {
  try {
    const isOCSAdmin = await verifyOCSAdmin(request);
    if (!isOCSAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - OCS admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, type } = body;

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid exercise id' },
        { status: 400 }
      );
    }

    const exercise = await updateExercise(id, name, 'rep');
    return NextResponse.json({
      success: true,
      exercise: { id: exercise.id, name: exercise.name, type: exercise.type },
      message: 'Exercise updated successfully',
    });
  } catch (error: any) {
    console.error('[API] PUT /api/admin/exercises - Error:', error);
    
    // Handle not found error
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    // Handle unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Exercise with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update exercise', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Delete an exercise
export async function DELETE(request: NextRequest) {
  try {
    const isOCSAdmin = await verifyOCSAdmin(request);
    if (!isOCSAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - OCS admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid exercise id' },
        { status: 400 }
      );
    }

    await deleteExercise(id);
    return NextResponse.json({
      success: true,
      message: 'Exercise deleted successfully',
    });
  } catch (error: any) {
    console.error('[API] DELETE /api/admin/exercises - Error:', error);
    
    // Handle not found error
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete exercise', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

