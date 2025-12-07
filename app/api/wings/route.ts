import { NextRequest, NextResponse } from 'next/server';
import { getWings, getWingsByName } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');
    
    // If name is provided, filter wings by name
    if (name) {
      const wings = await getWingsByName(name);
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

