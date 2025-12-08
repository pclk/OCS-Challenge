import { prisma } from './prisma';
import path from 'path';
import fs from 'fs';
import { ExerciseType } from '@prisma/client';
import { hashPassword, verifyPassword } from './auth';

// Parse CSV file (generic parser)
function parseCSV<T = Record<string, string>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || '';
    });
    return obj as T;
  });
}

// Initialize database schema and seed data
export async function initDatabase() {
  console.log('[DB] initDatabase - Starting database initialization...');
  const startTime = Date.now();

  try {
    // Check if data already exists
    const existingWingsCount = await prisma.wing.count();
    const existingExercisesCount = await prisma.exercise.count();
    const existingMappingsCount = await prisma.nameRankMapping.count();

    let wingsInserted = 0;
    let exercisesInserted = 0;
    let mappingsInserted = 0;
    let validWings: Array<{ value: string }> = [];
    let validExercises: Array<{ name: string; type: string }> = [];
    let validPersonnel: Array<{ name: string; wing: string }> = [];

    // Only load and insert wings if table is empty
    if (existingWingsCount === 0) {
      const wingsPath = path.join(process.cwd(), 'data', 'wings.csv');
      const wings = parseCSV<{ value: string }>(wingsPath);
      console.log('[DB] initDatabase - Loaded wings from CSV');
      validWings = wings.filter(w => w.value);
      
      for (const wing of validWings) {
        try {
          await prisma.wing.create({
            data: { value: wing.value },
          });
          wingsInserted++;
        } catch (error: any) {
          // Ignore unique constraint errors
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
      console.log('[DB] initDatabase - Inserted wings:', JSON.stringify({
        total: validWings.length,
        inserted: wingsInserted,
        skipped: validWings.length - wingsInserted
      }, null, 2));
    } else {
      console.log('[DB] initDatabase - Wings data already exists (count: ' + existingWingsCount + '), skipping CSV load and insertion');
    }

    // Only load and insert exercises if table is empty
    if (existingExercisesCount === 0) {
      const exercisePath = path.join(process.cwd(), 'data', 'exercise.csv');
      const exercises = parseCSV<{ name: string; type: string }>(exercisePath);
      console.log('[DB] initDatabase - Loaded exercises from CSV');
      validExercises = exercises.filter(e => e.name && e.type);
      
      for (const exercise of validExercises) {
        try {
          await prisma.exercise.create({
            data: {
              name: exercise.name,
              type: exercise.type as ExerciseType,
            },
          });
          exercisesInserted++;
        } catch (error: any) {
          // Ignore unique constraint errors
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
      console.log('[DB] initDatabase - Inserted exercises:', JSON.stringify({
        total: validExercises.length,
        inserted: exercisesInserted,
        skipped: validExercises.length - exercisesInserted
      }, null, 2));
    } else {
      console.log('[DB] initDatabase - Exercises data already exists (count: ' + existingExercisesCount + '), skipping CSV load and insertion');
    }

    // Only load and insert name-wing mappings if table is empty
    if (existingMappingsCount === 0) {
      const personnelPath = path.join(process.cwd(), 'data', 'personnel.csv');
      const personnel = parseCSV<{ name: string; wing: string }>(personnelPath);
      console.log('[DB] initDatabase - Loaded personnel from CSV');
      // Filter and map to name-wing only
      validPersonnel = personnel
        .filter(p => p.name && p.wing)
        .map(p => ({ name: p.name, wing: p.wing }));
      
      for (const person of validPersonnel) {
        try {
          await prisma.nameRankMapping.create({
            data: {
              name: person.name,
              wing: person.wing,
            } as any
          });
          mappingsInserted++;
        } catch (error: any) {
          // Ignore unique constraint errors
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
      console.log('[DB] initDatabase - Inserted name-wing mappings:', JSON.stringify({
        total: validPersonnel.length,
        inserted: mappingsInserted,
        skipped: validPersonnel.length - mappingsInserted
      }, null, 2));
    } else {
      console.log('[DB] initDatabase - Name-wing mappings data already exists (count: ' + existingMappingsCount + '), skipping CSV load and insertion');
    }

    const duration = Date.now() - startTime;
    console.log('[DB] initDatabase - Database initialization completed:', JSON.stringify({
      function: 'initDatabase',
      duration: `${duration}ms`,
      summary: {
        wings: { 
          existing: existingWingsCount, 
          loaded: validWings.length, 
          inserted: wingsInserted 
        },
        exercises: { 
          existing: existingExercisesCount, 
          loaded: validExercises.length, 
          inserted: exercisesInserted 
        },
        mappings: { 
          existing: existingMappingsCount, 
          loaded: validPersonnel.length, 
          inserted: mappingsInserted 
        }
      }
    }, null, 2));
  } catch (error) {
    console.error('[DB] initDatabase - Error:', error);
    throw error;
  }
}

// Warm /wings and /names routes by pre-fetching data
async function warmRoutes() {
  try {
    // Get base URL for API requests
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // Warm /wings route
    try {
      await fetch(`${baseUrl}/api/wings`);
    } catch (error) {
      // Silently fail - warming is non-critical
    }

    // Warm /names route
    try {
      await fetch(`${baseUrl}/api/names`);
      } catch (error) {
      // Silently fail - warming is non-critical
    }
  } catch (error) {
    // Silently fail - warming is non-critical
  }
}

// Initialize database (lazy initialization)
let initPromise: Promise<void> | null = null;
let isInitialized = false;
let warmPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (!isInitialized && !initPromise) {
    console.log('[DB] ensureInitialized - Database not initialized, starting initialization...');
    initPromise = initDatabase();
    await initPromise;
    isInitialized = true;
    console.log('[DB] ensureInitialized - Database initialization completed, marked as initialized');
    
    // Warm routes after initialization completes (only once)
    if (!warmPromise) {
      warmPromise = warmRoutes().catch(error => {
        console.error('[DB] ensureInitialized - Error warming routes (non-blocking):', error);
      });
      // Don't await - let it run in background
    }
  } else if (initPromise) {
    console.log('[DB] ensureInitialized - Database initialization already in progress, waiting...');
    await initPromise;
    console.log('[DB] ensureInitialized - Database initialization finished, proceeding');
  } else {
    console.log('[DB] ensureInitialized - Database already initialized, skipping');
  }
}

// Get or create user by name and wing
export async function getOrCreateUser(name: string, wing: string): Promise<number> {
  console.log('[DB] getOrCreateUser - Called with:', { name, wing });
  try {
  await ensureInitialized();
    
    console.log('[DB] getOrCreateUser - Searching for existing user with raw SQL:', { name, wing });
    // Use raw SQL to avoid Prisma adapter issues
    const existingUsers = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id 
      FROM users 
      WHERE name = ${name} AND wing = ${wing}
      LIMIT 1
    `;

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      console.log('[DB] getOrCreateUser - Retrieved existing user:', JSON.stringify({
        function: 'getOrCreateUser',
        parameters: { name, wing },
        result: { userId: existingUser.id, action: 'retrieved' },
      }, null, 2));
      return existingUser.id;
    }

    console.log('[DB] getOrCreateUser - No existing user found, creating new user:', { name, wing });
    // Use raw SQL for insert as well to avoid adapter issues
    const insertResult = await prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO users (name, wing, created_at)
      VALUES (${name}, ${wing}, NOW())
      RETURNING id
    `;
    
    const newUser = insertResult[0];
    console.log('[DB] getOrCreateUser - Created new user:', JSON.stringify({
      function: 'getOrCreateUser',
      parameters: { name, wing },
      result: { userId: newUser.id, action: 'created' },
    }, null, 2));
    return newUser.id;
  } catch (error: any) {
    console.error('[DB] getOrCreateUser - Error occurred:', {
      error: error?.message,
      code: error?.code,
      cause: error?.cause,
      originalCode: error?.cause?.originalCode,
      originalMessage: error?.cause?.originalMessage,
      stack: error?.stack?.split('\n').slice(0, 10)
    });
    throw error;
  }
}

// Check if name+wing exists in personnel CSV (NameRankMapping)
export async function isInPersonnelCSV(name: string, wing: string): Promise<boolean> {
  await ensureInitialized();
  const mapping = await prisma.nameRankMapping.findFirst({
    where: {
      name,
      wing,
    },
  });
  return !!mapping;
}

// Register a new user
export async function registerUser(
  name: string,
  wing: string,
  password: string
): Promise<{ id: number; name: string; wing: string | null; approved: boolean; pendingApproval: boolean }> {
  await ensureInitialized();
  
  // Check if user already exists
  const existingUserResult = await prisma.$queryRaw<Array<{
    id: number;
    password: string | null;
  }>>`
    SELECT id, password
    FROM users
    WHERE name = ${name} AND wing = ${wing}
    LIMIT 1
  `;

  // If user exists and has a password, throw error
  if (existingUserResult.length > 0 && existingUserResult[0].password) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = hashPassword(password);

  // If user exists but has no password, update them and auto-approve
  if (existingUserResult.length > 0) {
    const userId = existingUserResult[0].id;
    const updateResult = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      wing: string | null;
      approved: boolean;
      pending_approval: boolean;
    }>>`
      UPDATE users
      SET password = ${hashedPassword}, approved = true, pending_approval = false
      WHERE id = ${userId}
      RETURNING id, name, wing, approved, pending_approval
    `;

    const user = updateResult[0];
    return {
      id: user.id,
      name: user.name,
      wing: user.wing,
      approved: user.approved,
      pendingApproval: user.pending_approval,
    };
  }

  // Auto-approve all new users
  // Create new user using raw SQL to avoid Prisma type issues
  const insertResult = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    approved: boolean;
    pending_approval: boolean;
  }>>`
    INSERT INTO users (name, wing, password, approved, pending_approval, created_at)
    VALUES (${name}, ${wing}, ${hashedPassword}, true, false, NOW())
    RETURNING id, name, wing, approved, pending_approval
  `;

  const user = insertResult[0];

  return {
    id: user.id,
    name: user.name,
    wing: user.wing,
    approved: user.approved,
    pendingApproval: user.pending_approval,
  };
}

// Check if user exists but has no password
export async function checkUserExistsWithoutPassword(
  name: string,
  wing: string
): Promise<{ id: number; name: string; wing: string | null } | null> {
  await ensureInitialized();

  const user = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    password: string | null;
  }>>`
    SELECT id, name, wing, password
    FROM users
    WHERE name = ${name} AND wing = ${wing}
    LIMIT 1
  `;

  if (user.length === 0 || user[0].password) {
    return null;
  }

  return {
    id: user[0].id,
    name: user[0].name,
    wing: user[0].wing,
  };
}

// Check if user exists with password
export async function checkUserExistsWithPassword(
  name: string,
  wing: string
): Promise<{ id: number; name: string; wing: string | null } | null> {
  await ensureInitialized();

  const user = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    password: string | null;
  }>>`
    SELECT id, name, wing, password
    FROM users
    WHERE name = ${name} AND wing = ${wing}
    LIMIT 1
  `;

  if (user.length === 0 || !user[0].password) {
    return null;
  }

  return {
    id: user[0].id,
    name: user[0].name,
    wing: user[0].wing,
  };
}

// Set password for existing user and auto-approve
export async function setUserPassword(
  userId: number,
  password: string
): Promise<{ id: number; name: string; wing: string | null; approved: boolean }> {
  await ensureInitialized();

  // Hash password
  const hashedPassword = hashPassword(password);

  // Update user with password and auto-approve using raw SQL
  const updateResult = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    approved: boolean;
  }>>`
    UPDATE users
    SET password = ${hashedPassword}, approved = true, pending_approval = false
    WHERE id = ${userId}
    RETURNING id, name, wing, approved
  `;

  const user = updateResult[0];

  return {
    id: user.id,
    name: user.name,
    wing: user.wing,
    approved: user.approved,
  };
}

// Authenticate a user
export async function authenticateUser(
  name: string,
  wing: string,
  password: string
): Promise<{ id: number; name: string; wing: string | null; approved: boolean } | null> {
  await ensureInitialized();

  const userResult = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    password: string | null;
    approved: boolean;
    pending_approval: boolean;
  }>>`
    SELECT id, name, wing, password, approved, pending_approval
    FROM users
    WHERE name = ${name} AND wing = ${wing}
    LIMIT 1
  `;

  if (userResult.length === 0 || !userResult[0].password) {
    return null;
  }

  const user = userResult[0];

  // Verify password (user.password is already checked to be non-null above)
  if (!user.password || !verifyPassword(password, user.password)) {
    return null;
  }

  // Only allow login if approved (or from personnel CSV - which should be approved)
  if (!user.approved && !user.pending_approval) {
    // Check if in personnel CSV as fallback
    const isFromPersonnel = await isInPersonnelCSV(name, wing);
    if (!isFromPersonnel) {
      return null; // Not approved and not in personnel CSV
    }
  }

  // If pending approval, don't allow login yet
  if (user.pending_approval && !user.approved) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    wing: user.wing,
    approved: user.approved,
  };
}

// Get user by ID
export async function getUserById(id: number) {
  await ensureInitialized();
  const userResult = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    approved: boolean;
    pending_approval: boolean;
  }>>`
    SELECT id, name, wing, approved, pending_approval
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;

  if (userResult.length === 0) {
    return null;
  }

  const user = userResult[0];
  return {
    id: user.id,
    name: user.name,
    wing: user.wing,
    approved: user.approved,
    pendingApproval: user.pending_approval,
  };
}

// Get pending approvals
export async function getPendingApprovals() {
  await ensureInitialized();
  const users = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    created_at: Date;
  }>>`
    SELECT id, name, wing, created_at
    FROM users
    WHERE pending_approval = true AND approved = false
    ORDER BY created_at ASC
  `;
  
  return users.map(user => ({
    id: user.id,
    name: user.name,
    wing: user.wing,
    createdAt: user.created_at,
  }));
}

// Approve a user
export async function approveUser(userId: number) {
  await ensureInitialized();
  await prisma.$executeRaw`
    UPDATE users
    SET approved = true, pending_approval = false
    WHERE id = ${userId}
  `;
}

// Reject a user (delete the account)
export async function rejectUser(userId: number) {
  await ensureInitialized();
  // Delete all scores first (foreign key constraint)
  await prisma.$executeRaw`DELETE FROM scores WHERE user_id = ${userId}`;
  // Then delete the user
  await prisma.user.delete({
    where: { id: userId },
  });
}

// Get all users
export async function getAllUsers() {
  await ensureInitialized();
  const users = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    approved: boolean;
    pending_approval: boolean;
    created_at: Date;
  }>>`
    SELECT id, name, wing, approved, pending_approval, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  
  return users.map(user => ({
    id: user.id,
    name: user.name,
    wing: user.wing,
    approved: user.approved,
    pendingApproval: user.pending_approval,
    createdAt: user.created_at,
  }));
}

// Create a new user (admin function)
export async function createUser(
  name: string,
  wing: string | null,
  password?: string
): Promise<{ id: number; name: string; wing: string | null; approved: boolean; pendingApproval: boolean }> {
  await ensureInitialized();
  
  // Check if user already exists
  const existingUserResult = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id
    FROM users
    WHERE name = ${name} AND (${wing}::text IS NULL OR wing = ${wing})
    LIMIT 1
  `;

  if (existingUserResult.length > 0) {
    throw new Error('User with this name and wing already exists');
  }

  const hashedPassword = password ? hashPassword(password) : null;

  const insertResult = await prisma.$queryRaw<Array<{
    id: number;
    name: string;
    wing: string | null;
    approved: boolean;
    pending_approval: boolean;
  }>>`
    INSERT INTO users (name, wing, password, approved, pending_approval, created_at)
    VALUES (${name}, ${wing}, ${hashedPassword}, true, false, NOW())
    RETURNING id, name, wing, approved, pending_approval
  `;

  const user = insertResult[0];
  return {
    id: user.id,
    name: user.name,
    wing: user.wing,
    approved: user.approved,
    pendingApproval: user.pending_approval,
  };
}

// Update a user (admin function)
export async function updateUser(
  userId: number,
  updates: { name?: string; wing?: string | null; password?: string; approved?: boolean }
): Promise<{ id: number; name: string; wing: string | null; approved: boolean; pendingApproval: boolean }> {
  await ensureInitialized();
  
  // Build update object for Prisma
  const updateData: any = {};
  
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  
  if (updates.wing !== undefined) {
    updateData.wing = updates.wing;
  }
  
  if (updates.password !== undefined) {
    updateData.password = updates.password ? hashPassword(updates.password) : null;
  }
  
  if (updates.approved !== undefined) {
    updateData.approved = updates.approved;
    if (updates.approved) {
      updateData.pendingApproval = false;
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    // No updates, just return the user
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      wing: user.wing,
      approved: user.approved,
      pendingApproval: user.pendingApproval,
    };
  }
  
  // Build the SET clause manually but safely using parameterized queries
  const setParts: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  if (updateData.name !== undefined) {
    setParts.push(`name = $${paramIndex}`);
    params.push(updateData.name);
    paramIndex++;
  }
  if (updateData.wing !== undefined) {
    if (updateData.wing === null) {
      setParts.push('wing = NULL');
    } else {
      setParts.push(`wing = $${paramIndex}`);
      params.push(updateData.wing);
      paramIndex++;
    }
  }
  if (updateData.password !== undefined) {
    if (updateData.password === null) {
      setParts.push('password = NULL');
    } else {
      setParts.push(`password = $${paramIndex}`);
      params.push(updateData.password);
      paramIndex++;
    }
  }
  if (updateData.approved !== undefined) {
    setParts.push(`approved = $${paramIndex}`);
    params.push(updateData.approved);
    paramIndex++;
  }
  if (updateData.pendingApproval !== undefined) {
    setParts.push(`pending_approval = $${paramIndex}`);
    params.push(updateData.pendingApproval);
    paramIndex++;
  }
  
  params.push(userId);
  
  const query = `
    UPDATE users
    SET ${setParts.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, wing, approved, pending_approval
  `;
  
  const updateResult = await prisma.$queryRawUnsafe<Array<{
    id: number;
    name: string;
    wing: string | null;
    approved: boolean;
    pending_approval: boolean;
  }>>(query, ...params);

  if (updateResult.length === 0) {
    throw new Error('User not found');
  }

  const user = updateResult[0];
  return {
    id: user.id,
    name: user.name,
    wing: user.wing,
    approved: user.approved,
    pendingApproval: user.pending_approval,
  };
}

// Delete a user account (for regular users to delete their own account)
export async function deleteUserAccount(userId: number) {
  await ensureInitialized();
  // Get user info before deletion for audit log
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Delete all scores first (foreign key constraint)
  await prisma.$executeRaw`DELETE FROM scores WHERE user_id = ${userId}`;
  // Then delete the user
  await prisma.user.delete({
    where: { id: userId },
  });
  
  return user;
}

// Log account action
export async function logAccountAction(
  userId: number | null,
  userName: string | null,
  userWing: string | null,
  action: string,
  details?: any
) {
  await ensureInitialized();
  try {
    await prisma.$executeRaw`
      INSERT INTO account_actions (user_id, user_name, user_wing, action, details, created_at)
      VALUES (${userId}, ${userName}, ${userWing}, ${action}, ${details ? JSON.stringify(details) : null}::jsonb, NOW())
    `;
  } catch (error) {
    console.error('[DB] Error logging account action:', error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

// Get all account actions (for admin)
export async function getAccountActions(limit: number = 100) {
  await ensureInitialized();
  const actions = await prisma.$queryRaw<Array<{
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_wing: string | null;
    action: string;
    details: string | null;
    created_at: Date;
  }>>`
    SELECT id, user_id, user_name, user_wing, action, details, created_at
    FROM account_actions
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  
  return actions.map(action => ({
    id: action.id,
    userId: action.user_id,
    userName: action.user_name,
    userWing: action.user_wing,
    action: action.action,
    details: action.details ? JSON.parse(action.details) : null,
    createdAt: action.created_at,
  }));
}

// Get all wings
export async function getWings() {
  await ensureInitialized();
  const wings = await prisma.wing.findMany({
    orderBy: { value: 'asc' },
  });
  console.log('[DB] getWings - Retrieved wings:', JSON.stringify({
      function: 'getWings',
      parameters: {},
    result: { count: wings.length },
    data: wings.slice(0, 3)
    }, null, 2));
  return wings;
}

// Get wings by name (returns empty array if no matches)
export async function getWingsByName(name?: string | null) {
  if (!name) {
    console.log('[DB] getWingsByName - No name provided, returning empty array:', JSON.stringify({
      function: 'getWingsByName',
      parameters: { name: null },
      result: { count: 0 },
      data: []
    }, null, 2));
    return [];
  }
  await ensureInitialized();
  const mappings = await prisma.nameRankMapping.findMany({
    where: { name },
    select: { wing: true },
    distinct: ['wing'],
    orderBy: { wing: 'asc' },
  });
  const wings = mappings.map((m: { wing: string }) => ({ wing: m.wing }));
  console.log('[DB] getWingsByName - Retrieved wings:', JSON.stringify({
    function: 'getWingsByName',
    parameters: { name },
    result: { count: wings.length },
    data: wings.slice(0, 3)
    }, null, 2));
  return wings;
}

// Get all names
export async function getAllNames() {
  await ensureInitialized();
  const mappings = await prisma.nameRankMapping.findMany({
    select: { name: true },
    distinct: ['name'],
    orderBy: { name: 'asc' },
  });
  const names = mappings.map((m: { name: string }) => ({ name: m.name }));
  console.log('[DB] getAllNames - Retrieved names:', JSON.stringify({
    function: 'getAllNames',
    parameters: {},
    result: { count: names.length },
    data: names.slice(0, 3)
  }, null, 2));
  return names;
}

// Get user info (wing) by name (returns first match if multiple exist)
export async function getUserInfoByName(name: string) {
  console.log('[DB] getUserInfoByName - Called with name:', name);
  if (!name) {
    console.log('[DB] getUserInfoByName - No name provided, returning null:', JSON.stringify({
      function: 'getUserInfoByName',
      parameters: { name: null },
      result: { found: false }
    }, null, 2));
    return null;
  }
  try {
  await ensureInitialized();
    console.log('[DB] getUserInfoByName - Database initialized, executing raw SQL query');
    
    // Use raw SQL query to avoid Prisma adapter issues with the model name containing "rank"
    // The model name "NameRankMapping" might be causing Prisma to generate incorrect SQL with RANK()
    const result = await prisma.$queryRaw<Array<{ wing: string }>>`
      SELECT wing 
      FROM name_rank_mappings 
      WHERE name = ${name}
      LIMIT 1
    `;
    
    console.log('[DB] getUserInfoByName - Raw SQL query executed successfully:', {
      resultCount: result.length,
      firstResult: result[0] || null
    });
    
    const mapping = result[0] || null;
    const userInfo = mapping ? { wing: mapping.wing } : null;
    console.log('[DB] getUserInfoByName - Retrieved user info:', JSON.stringify({
      function: 'getUserInfoByName',
      parameters: { name },
      result: { found: !!userInfo },
      data: userInfo ? [userInfo] : null
    }, null, 2));
    return userInfo;
  } catch (error: any) {
    console.error('[DB] getUserInfoByName - Error occurred:', {
      error: error?.message,
      code: error?.code,
      cause: error?.cause,
      originalCode: error?.cause?.originalCode,
      originalMessage: error?.cause?.originalMessage,
      stack: error?.stack?.split('\n').slice(0, 10)
    });
    throw error;
  }
}

// Get all exercises
export async function getExercises() {
  await ensureInitialized();
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: 'asc' },
  });
  console.log('[DB] getExercises - Retrieved exercises:', JSON.stringify({
      function: 'getExercises',
      parameters: {},
    result: { count: exercises.length },
    data: exercises.slice(0, 3)
    }, null, 2));
  return exercises;
}

// Get exercise by id
export async function getExerciseById(id: number) {
  await ensureInitialized();
  const exercise = await prisma.exercise.findUnique({
    where: { id },
  });
  console.log('[DB] getExerciseById - Retrieved exercise:', JSON.stringify({
      function: 'getExerciseById',
      parameters: { id },
    result: { found: !!exercise },
    data: exercise ? [exercise] : null
    }, null, 2));
  return exercise;
}

// Create a score
export async function createScore(userId: number, exerciseId: number, value: number) {
  await ensureInitialized();
  await prisma.score.create({
    data: {
      userId,
      exerciseId,
      value,
    },
  });
}

// Create multiple scores (bulk)
export async function createScores(scores: Array<{ userId: number; exerciseId: number; value: number }>) {
  console.log('[DB] createScores - Called with scores:', {
    count: scores.length,
    scores: scores.slice(0, 3) // Log first 3 for debugging
  });
  
  await ensureInitialized();
  
  if (scores.length === 0) {
    console.log('[DB] createScores - No scores to create, returning early');
    return;
  }
  
  try {
    const dataToInsert = scores.map(score => ({
      userId: score.userId,
      exerciseId: score.exerciseId,
      value: score.value,
    }));
    
    console.log('[DB] createScores - About to execute createMany:', {
      dataCount: dataToInsert.length,
      firstRecord: dataToInsert[0],
      skipDuplicates: true
    });
    
    // Use createMany for bulk insert - more efficient and avoids transaction issues with adapter
    const result = await prisma.score.createMany({
      data: dataToInsert,
      skipDuplicates: true, // Skip if duplicate score exists
    });
    
    console.log('[DB] createScores - createMany executed successfully:', {
      count: result.count
    });
  } catch (error: any) {
    console.error('[DB] createScores - Error occurred:', {
      error: error?.message,
      code: error?.code,
      cause: error?.cause,
      originalCode: error?.cause?.originalCode,
      originalMessage: error?.cause?.originalMessage,
      stack: error?.stack?.split('\n').slice(0, 10)
    });
    throw error;
  }
}

// Get leaderboard for a specific exercise (top N, sorted by highest rep, optionally filtered by wing)
export async function getLeaderboard(exerciseId: number, limit: number = 10, wing?: string | null) {
  await ensureInitialized();
  
  const where: any = {
    exerciseId,
  };
    
    if (wing && wing !== 'OCS LEVEL') {
    where.user = {
      wing,
    };
  }
  
  const scores = await prisma.score.findMany({
    where,
    take: limit,
    orderBy: [
      { value: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          wing: true,
        },
      },
    },
  });
  
  const rows = scores.map(s => ({
    id: s.id,
    value: s.value,
    created_at: s.createdAt.toISOString(),
    user_name: s.user.name,
    wing: s.user.wing,
    user_id: s.user.id,
  }));
  
  console.log('[DB] getLeaderboard - Retrieved leaderboard:', JSON.stringify({
      function: 'getLeaderboard',
      parameters: { exerciseId, limit, wing: wing || null },
      result: { count: rows.length },
      data: rows.slice(0, 3)
    }, null, 2));
    return rows;
}

// Get exercise-based leaderboard (highest rep per exercise, optionally filtered by wing)
export async function getExerciseBasedLeaderboard(wing?: string | null) {
  await ensureInitialized();
  const exercises = await getExercises();
  const results: Array<{
    exercise_id: number;
    exercise_name: string;
    exercise_type: string;
    value: number;
    created_at: string;
    user_name: string;
    wing: string | null;
    user_id: number;
  }> = [];

    for (const exercise of exercises) {
    const where: any = {
      exerciseId: exercise.id,
    };
      
      if (wing && wing !== 'OCS LEVEL') {
      where.user = {
        wing,
      };
    }
    
    const topScore = await prisma.score.findFirst({
      where,
      orderBy: [
        { value: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            wing: true,
          },
        },
      },
    });

    if (topScore) {
        results.push({
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          exercise_type: exercise.type,
        value: topScore.value,
        created_at: topScore.createdAt.toISOString(),
        user_name: topScore.user.name,
        wing: topScore.user.wing,
        user_id: topScore.user.id,
      });
    }
  }

  console.log('[DB] getExerciseBasedLeaderboard - Retrieved exercise-based leaderboard:', JSON.stringify({
    function: 'getExerciseBasedLeaderboard',
    parameters: { wing: wing || null },
    result: { count: results.length },
    data: results.slice(0, 3)
  }, null, 2));
  return results;
}

// Get leaderboard for all exercises (optionally filtered by wing)
export async function getAllLeaderboards(limit: number = 10, wing?: string | null) {
  await ensureInitialized();
  const exercises = await getExercises();
  const leaderboards: Record<string, Array<{
    id: number;
    value: number;
    created_at: string;
    user_name: string;
    wing: string | null;
    user_id: number;
  }>> = {};

  for (const exercise of exercises) {
    leaderboards[exercise.name] = await getLeaderboard(exercise.id, limit, wing);
  }

  console.log('[DB] getAllLeaderboards - Retrieved all leaderboards:', JSON.stringify({
    function: 'getAllLeaderboards',
    parameters: { limit, wing: wing || null },
    result: { 
      exerciseCount: Object.keys(leaderboards).length,
      totalEntries: Object.values(leaderboards).reduce((sum, entries) => sum + entries.length, 0)
    },
    data: Object.values(leaderboards).slice(0, 3)
  }, null, 2));
  return leaderboards;
}

// Get total reps leaderboard - sums best score per rep-type exercise per user across entire OCS
export async function getTotalRepsLeaderboard() {
  await ensureInitialized();
  
  // Use raw SQL to efficiently sum best reps per exercise per user
  // Only count exercises with type 'rep', not 'seconds'
  // For each user, get their best score per exercise, then sum those
  const results = await prisma.$queryRaw<Array<{
    user_id: number;
    user_name: string;
    wing: string | null;
    total_reps: bigint;
  }>>`
    WITH best_scores_per_exercise AS (
      SELECT 
        s.user_id,
        s.exercise_id,
        MAX(s.value) as best_value
      FROM scores s
      INNER JOIN exercises e ON e.id = s.exercise_id AND e.type = 'rep'
      GROUP BY s.user_id, s.exercise_id
    )
    SELECT 
      u.id as user_id,
      u.name as user_name,
      u.wing,
      COALESCE(SUM(bs.best_value), 0)::bigint as total_reps
    FROM users u
    LEFT JOIN best_scores_per_exercise bs ON bs.user_id = u.id
    GROUP BY u.id, u.name, u.wing
    HAVING COALESCE(SUM(bs.best_value), 0) > 0
    ORDER BY total_reps DESC, u.name ASC
  `;
  
  const leaderboard = results.map((row, index) => ({
    rank: index + 1,
    user_id: Number(row.user_id),
    user_name: row.user_name,
    wing: row.wing,
    total_reps: Number(row.total_reps),
    achieved_goal: Number(row.total_reps) >= 20260,
  }));
  
  console.log('[DB] getTotalRepsLeaderboard - Retrieved total reps leaderboard:', JSON.stringify({
    function: 'getTotalRepsLeaderboard',
    parameters: {},
    result: { count: leaderboard.length },
    data: leaderboard.slice(0, 5)
  }, null, 2));
  
  return leaderboard;
}
