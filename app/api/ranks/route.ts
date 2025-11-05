import { NextResponse } from 'next/server';
import { getRanks } from '@/lib/db';

export async function GET() {
  try {
    const ranks = getRanks();
    return NextResponse.json(ranks.map(r => r.value));
  } catch (error) {
    console.error('Error fetching ranks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranks' },
      { status: 500 }
    );
  }
}

