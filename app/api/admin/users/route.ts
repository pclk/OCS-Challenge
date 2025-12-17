import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUser, rejectUser } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/auth';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');
  return verifyAdminPassword(token);
}

// Get all users
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await getAllUsers();
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('[API] GET /api/admin/users - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create a new user
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, wing, password } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const user = await createUser(name, wing || null, password);
    return NextResponse.json({
      success: true,
      user,
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('[API] POST /api/admin/users - Error:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update a user
export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, name, wing, password, approved } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (wing !== undefined) updates.wing = wing;
    if (password !== undefined) updates.password = password;
    if (approved !== undefined) updates.approved = approved;

    const user = await updateUser(userId, updates);
    return NextResponse.json({
      success: true,
      user,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('[API] PUT /api/admin/users - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Delete a user
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    await rejectUser(userId);
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('[API] DELETE /api/admin/users - Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


