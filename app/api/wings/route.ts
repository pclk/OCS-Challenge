import { NextRequest, NextResponse } from 'next/server';
import { getWings, getWingsByRankAndName } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rank = searchParams.get('rank');
    const name = searchParams.get('name');
    
    // If rank and name are provided, filter wings by them
    if (rank && name) {
      const wings = await getWingsByRankAndName(rank, name);
      return NextResponse.json(wings.map(w => w.wing));
    }
    
    // Otherwise return all wings
    const wings = await getWings();
    return NextResponse.json(wings.map(w => w.value));
  } catch (error) {
    console.error('Error fetching wings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wings' },
      { status: 500 }
    );
  }
}

