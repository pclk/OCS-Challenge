import { NextRequest, NextResponse } from 'next/server';
import { getUserInfoByName, getWingsByName } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');
    const wing = searchParams.get('wing');
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name query parameter is required' },
        { status: 400 }
      );
    }
    
    // If wing is provided, verify the name has this wing
    if (wing) {
      const wings = await getWingsByName(name);
      const hasWing = wings.some(w => w.wing === wing);
      if (!hasWing) {
        return NextResponse.json(
          { error: 'User not found with this name and wing combination' },
          { status: 404 }
        );
      }
      return NextResponse.json({ wing });
    }
    
    // Otherwise just get wing by name
    const userInfo = await getUserInfoByName(name);
    
    if (!userInfo) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(userInfo);
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}
