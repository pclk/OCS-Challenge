import { NextRequest, NextResponse } from 'next/server';
import { bulkUpsertUsers } from '@/lib/db';
import { getAdminLevel, getWingFromPassword } from '@/lib/auth';

async function verifyWingAdmin(request: NextRequest): Promise<{ isAdmin: boolean; wing?: string | null }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { isAdmin: false };
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  if (adminLevel === 'WING' || adminLevel === 'OCS') {
    const wing = getWingFromPassword(token);
    return { isAdmin: true, wing };
  }
  return { isAdmin: false };
}

// Parse CSV content
function parseCSVContent(csvContent: string): Array<{ name: string }> {
  const lines = csvContent.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Check if first line is header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('name');
  
  const dataLines = hasHeader ? lines.slice(1) : lines;
  
  return dataLines.map(line => {
    // Handle CSV with potential commas in values (simple parsing)
    const values = line.split(',').map(v => v.trim());
    return {
      name: (values[0] || '').toUpperCase().trim(),
    };
  }).filter(row => row.name); // Filter out empty rows
}

// Upload nominal roll CSV
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, wing } = await verifyWingAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Wing admin access required' },
        { status: 401 }
      );
    }

    if (!wing) {
      return NextResponse.json(
        { error: 'Wing not found. Please ensure you are logged in with a wing-specific password.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();
    
    // Parse CSV
    const users = parseCSVContent(csvContent);
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found in CSV file' },
        { status: 400 }
      );
    }

    // Add wing to each user
    const usersWithWing = users.map(user => ({
      name: user.name,
      wing: wing,
    }));

    // Bulk upsert users
    const results = await bulkUpsertUsers(usersWithWing);

    return NextResponse.json({
      success: true,
      message: 'Nominal roll uploaded successfully',
      summary: {
        total: users.length,
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
        errorDetails: results.errors,
      },
    });
  } catch (error: any) {
    console.error('[API] POST /api/admin/upload-nominal-roll - Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload nominal roll', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



