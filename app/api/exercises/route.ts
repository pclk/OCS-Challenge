import { NextResponse } from 'next/server';
import { getExercises } from '@/lib/db';

export async function GET() {
  try {
    const exercises = await getExercises();
    return NextResponse.json(exercises.map(e => ({ id: e.id, name: e.name, type: e.type })));
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}

