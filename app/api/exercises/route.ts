import { NextResponse } from 'next/server';
import { getExercises } from '@/lib/db';

export async function GET() {
  try {
    const exercises = getExercises();
    return NextResponse.json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}

