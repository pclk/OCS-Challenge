import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wing = searchParams.get('wing');
    
    if (!wing) {
      return NextResponse.json(
        { error: 'Wing query parameter is required' },
        { status: 400 }
      );
    }
    
    const users = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT DISTINCT name
      FROM users
      WHERE wing = ${wing} AND name IS NOT NULL
      ORDER BY name ASC
    `;
    
    return NextResponse.json(users.map(u => u.name));
  } catch (error) {
    console.error('Error fetching names by wing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch names' },
      { status: 500 }
    );
  }
}

