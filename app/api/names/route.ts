import { NextResponse } from 'next/server';
import { getAllNames } from '@/lib/db';

export async function GET() {
  try {
    const names = await getAllNames();
    return NextResponse.json(names.map(n => n.name));
  } catch (error) {
    console.error('Error fetching names:', error);
    return NextResponse.json(
      { error: 'Failed to fetch names' },
      { status: 500 }
    );
  }
}

