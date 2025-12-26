import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUsersPaginated, createUser, updateUser, rejectUser, getUserById } from '@/lib/db';
import { getAdminLevel, getWingFromPassword } from '@/lib/auth';

async function verifyOCSAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  return adminLevel === 'OCS';
}

async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; wing?: string | null }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { isAdmin: false };
  }
  const token = authHeader.replace('Bearer ', '');
  const adminLevel = getAdminLevel(token);
  if (adminLevel === 'OCS' || adminLevel === 'WING') {
    const wing = getWingFromPassword(token);
    console.log('[API] verifyAdmin - Admin level:', adminLevel, 'Wing:', wing, 'Token length:', token.length);
    return { isAdmin: true, wing };
  }
  return { isAdmin: false };
}

// Get all users (with pagination and search)
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, wing: adminWing } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const search = url.searchParams.get('search') || undefined;
    
    // For wing admins, ALWAYS force filter by their wing (cannot see other wings)
    // For OCS admins, use the wing parameter if provided, otherwise show all
    let wing: string | undefined = undefined;
    if (adminWing) {
      // Wing admin - must filter by their wing
      wing = adminWing.trim();
      console.log('[API] GET /api/admin/users - Wing admin detected, filtering by wing:', wing);
    } else {
      // OCS admin - can optionally filter by wing parameter
      const wingParam = url.searchParams.get('wing');
      wing = wingParam ? wingParam.trim() : undefined;
      console.log('[API] GET /api/admin/users - OCS admin, wing filter:', wing || 'none (showing all)');
    }

    const result = await getUsersPaginated(page, limit, search, wing);
    return NextResponse.json({
      success: true,
      users: result.users,
      pagination: result.pagination,
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
    const { isAdmin, wing: adminWing } = await verifyAdmin(request);
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

    // For wing admins, force the wing to be their own wing
    // For OCS admins, use the provided wing or null
    const userWing = adminWing || wing || null;

    const user = await createUser(name, userWing, password);
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
    const { isAdmin, wing: adminWing } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, name, wing, password } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    // For wing admins, verify the user belongs to their wing
    if (adminWing) {
      const existingUser = await getUserById(userId);
      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      if (existingUser.wing !== adminWing) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only update users from your own wing' },
          { status: 403 }
        );
      }
      // Prevent wing admins from changing the wing
      if (wing !== undefined && wing !== adminWing) {
        return NextResponse.json(
          { error: 'Unauthorized - You cannot change the wing of users' },
          { status: 403 }
        );
      }
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    // For wing admins, always keep their wing
    if (wing !== undefined) {
      updates.wing = adminWing || wing;
    }
    if (password !== undefined) updates.password = password;

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
    const { isAdmin, wing: adminWing } = await verifyAdmin(request);
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

    // For wing admins, verify the user belongs to their wing
    if (adminWing) {
      const existingUser = await getUserById(userId);
      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      if (existingUser.wing !== adminWing) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only delete users from your own wing' },
          { status: 403 }
        );
      }
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


