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
    
    const mappings = await prisma.nameRankMapping.findMany({
      where: { wing },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json(mappings.map(m => m.name));
  } catch (error) {
    console.error('Error fetching names by wing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch names' },
      { status: 500 }
    );
  }
}

