import { prisma } from './prisma';
import path from 'path';
import fs from 'fs';
import { ExerciseType } from '@prisma/client';

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
