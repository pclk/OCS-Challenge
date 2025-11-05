import { NextRequest, NextResponse } from 'next/server';
import { getNamesByRank } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rank = searchParams.get('rank');
    
    const names = getNamesByRank(rank);
    return NextResponse.json(names.map(n => n.name));
  } catch (error) {
    console.error('Error fetching names:', error);
    return NextResponse.json(
      { error: 'Failed to fetch names' },
      { status: 500 }
    );
  }
}

