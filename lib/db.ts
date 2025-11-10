import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Create PostgreSQL connection pool lazily
// For Railway production: DATABASE_URL is automatically set by Railway
// For local development: Use Railway's public connection string or set DATABASE_URL
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required. Please set it in your environment variables.');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

function checkDatabaseAvailable(): void {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required. Please set it in your environment variables.');
  }
}

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

// Check if table data already exists by comparing count
async function checkTableDataExists(client: any, tableName: string, expectedCount: number): Promise<boolean> {
  if (expectedCount === 0) return true; // No data to insert
  
  const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
  const existingCount = parseInt(result.rows[0].count, 10);
  
  // If counts match, data likely already exists
  return existingCount >= expectedCount;
}

// Bulk insert helper function
async function bulkInsert(
  client: any,
  tableName: string,
  data: any[],
  columns: string[],
  conflictColumns: string[]
): Promise<number> {
  if (data.length === 0) return 0;
  
  // Batch size for bulk inserts (PostgreSQL has a limit on parameters)
  const BATCH_SIZE = 1000;
  let totalInserted = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const values: any[] = [];
    const placeholders: string[] = [];
    
    batch.forEach((item, rowIndex) => {
      const rowPlaceholders: string[] = [];
      columns.forEach((col, colIndex) => {
        const paramIndex = rowIndex * columns.length + colIndex + 1;
        values.push(item[col]);
        rowPlaceholders.push(`$${paramIndex}`);
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });
    
    const conflictClause = conflictColumns.length > 0
      ? `ON CONFLICT (${conflictColumns.join(', ')}) DO NOTHING`
      : '';
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ${conflictClause}
      RETURNING id
    `;
    
    const result = await client.query(query, values);
    totalInserted += result.rows.length;
  }
  
  return totalInserted;
}

// Initialize database schema
export async function initDatabase() {
  console.log('[DB] initDatabase - Starting database initialization...');
  const startTime = Date.now();
  checkDatabaseAvailable();
  const client = await getPool().connect();
  try {
    console.log('[DB] initDatabase - Creating tables...');
    // Create ranks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ranks (
        id SERIAL PRIMARY KEY,
        value TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create wings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wings (
        id SERIAL PRIMARY KEY,
        value TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create exercises table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('rep', 'seconds')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create name_rank_mappings table (includes wing for validation)
    await client.query(`
      CREATE TABLE IF NOT EXISTS name_rank_mappings (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        rank TEXT NOT NULL,
        wing TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, rank, wing)
      )
    `);

    // Migrate name_rank_mappings table if it doesn't have wing column
    try {
      await client.query(`ALTER TABLE name_rank_mappings ADD COLUMN wing TEXT`);
      console.log('[DB] initDatabase - Added wing column to name_rank_mappings table');
    } catch (e: any) {
      // Column already exists, ignore (PostgreSQL error code 42701)
      if (e.code !== '42701') {
        throw e;
      }
    }

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        rank TEXT,
        name TEXT NOT NULL,
        wing TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing users table if it doesn't have rank and wing columns
    try {
      await client.query(`ALTER TABLE users ADD COLUMN rank TEXT`);
      console.log('[DB] initDatabase - Added rank column to users table');
    } catch (e: any) {
      // Column already exists, ignore (PostgreSQL error code 42701)
      if (e.code !== '42701') {
        throw e;
      }
    }

    try {
      await client.query(`ALTER TABLE users ADD COLUMN wing TEXT`);
      console.log('[DB] initDatabase - Added wing column to users table');
    } catch (e: any) {
      // Column already exists, ignore (PostgreSQL error code 42701)
      if (e.code !== '42701') {
        throw e;
      }
    }

    // Create scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        value INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      )
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scores_exercise_value ON scores(exercise_id, value DESC);
      CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_wing ON users(wing);
      CREATE INDEX IF NOT EXISTS idx_name_rank_mappings_rank ON name_rank_mappings(rank);
    `);
    console.log('[DB] initDatabase - Tables and indexes created');

    // Load ranks from ranks.csv
    const ranksPath = path.join(process.cwd(), 'data', 'ranks.csv');
    const ranks = parseCSV<{ value: string }>(ranksPath);
    console.log('[DB] initDatabase - Loaded ranks from CSV:');

    // Load wings from wings.csv
    const wingsPath = path.join(process.cwd(), 'data', 'wings.csv');
    const wings = parseCSV<{ value: string }>(wingsPath);
    console.log('[DB] initDatabase - Loaded wings from CSV:');

    // Load personnel from personnel.csv
    const personnelPath = path.join(process.cwd(), 'data', 'personnel.csv');
    const personnel = parseCSV<{ rank: string; name: string; wing: string }>(personnelPath);
    console.log('[DB] initDatabase - Loaded personnel from CSV:');
    
    // Load exercises from exercise.csv
    const exercisePath = path.join(process.cwd(), 'data', 'exercise.csv');
    const exercises = parseCSV<{ name: string; type: string }>(exercisePath);
    console.log('[DB] initDatabase - Loaded exercises from CSV');

    // Insert ranks
    const validRanks = ranks.filter(r => r.value);
    let ranksInserted = 0;
    
    if (await checkTableDataExists(client, 'ranks', validRanks.length)) {
      console.log('[DB] initDatabase - Ranks data already exists, skipping insertion');
    } else {
      ranksInserted = await bulkInsert(
        client,
        'ranks',
        validRanks,
        ['value'],
        ['value']
      );
      console.log('[DB] initDatabase - Inserted ranks:', JSON.stringify({
        total: validRanks.length,
        inserted: ranksInserted,
        skipped: validRanks.length - ranksInserted
      }, null, 2));
    }

    // Insert wings
    const validWings = wings.filter(w => w.value);
    let wingsInserted = 0;
    
    if (await checkTableDataExists(client, 'wings', validWings.length)) {
      console.log('[DB] initDatabase - Wings data already exists, skipping insertion');
    } else {
      wingsInserted = await bulkInsert(
        client,
        'wings',
        validWings,
        ['value'],
        ['value']
      );
      console.log('[DB] initDatabase - Inserted wings:', JSON.stringify({
        total: validWings.length,
        inserted: wingsInserted,
        skipped: validWings.length - wingsInserted
      }, null, 2));
    }

    // Insert exercises
    const validExercises = exercises.filter(e => e.name && e.type);
    let exercisesInserted = 0;
    
    if (await checkTableDataExists(client, 'exercises', validExercises.length)) {
      console.log('[DB] initDatabase - Exercises data already exists, skipping insertion');
    } else {
      exercisesInserted = await bulkInsert(
        client,
        'exercises',
        validExercises,
        ['name', 'type'],
        ['name']
      );
      console.log('[DB] initDatabase - Inserted exercises:', JSON.stringify({
        total: validExercises.length,
        inserted: exercisesInserted,
        skipped: validExercises.length - exercisesInserted
      }, null, 2));
    }

    // Insert name-rank-wing mappings
    const validPersonnel = personnel.filter(p => p.name && p.rank && p.wing);
    let mappingsInserted = 0;
    
    if (await checkTableDataExists(client, 'name_rank_mappings', validPersonnel.length)) {
      console.log('[DB] initDatabase - Name-rank-wing mappings data already exists, skipping insertion');
    } else {
      mappingsInserted = await bulkInsert(
        client,
        'name_rank_mappings',
        validPersonnel,
        ['name', 'rank', 'wing'],
        ['name', 'rank', 'wing']
      );
      console.log('[DB] initDatabase - Inserted name-rank-wing mappings:', JSON.stringify({
        total: validPersonnel.length,
        inserted: mappingsInserted,
        skipped: validPersonnel.length - mappingsInserted
      }, null, 2));
    }

    const duration = Date.now() - startTime;
    console.log('[DB] initDatabase - Database initialization completed:', JSON.stringify({
      function: 'initDatabase',
      duration: `${duration}ms`,
      summary: {
        ranks: { total: validRanks.length, inserted: ranksInserted },
        wings: { total: validWings.length, inserted: wingsInserted },
        exercises: { total: validExercises.length, inserted: exercisesInserted },
        mappings: { total: validPersonnel.length, inserted: mappingsInserted }
      }
    }, null, 2));
  } finally {
    client.release();
  }
}

// Warm /wings and /names routes by pre-fetching data
async function warmRoutes() {
  console.log('[DB] warmRoutes - Starting to warm /wings and /names routes...');
  const warmStartTime = Date.now();
  try {
    // Get base URL for API requests
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // Warm /wings route (single fetch request)
    try {
      const wingsResponse = await fetch(`${baseUrl}/api/wings`);
      const wingsData = await wingsResponse.json();
      console.log('[DB] warmRoutes - Warmed /wings route:', JSON.stringify({
        route: '/api/wings',
        status: wingsResponse.status,
        count: Array.isArray(wingsData) ? wingsData.length : 0
      }, null, 2));
    } catch (error) {
      console.error('[DB] warmRoutes - Error warming /api/wings:', error);
    }

    // Warm /names route (single fetch request with first available rank)
    const allRanks = await getRanks();
    if (allRanks.length > 0) {
      try {
        const namesResponse = await fetch(`${baseUrl}/api/names?rank=${encodeURIComponent(allRanks[0].value)}`);
        const namesData = await namesResponse.json();
        console.log('[DB] warmRoutes - Warmed /names route:', JSON.stringify({
          route: '/api/names',
          status: namesResponse.status,
          rank: allRanks[0].value,
          count: Array.isArray(namesData) ? namesData.length : 0
        }, null, 2));
      } catch (error) {
        console.error('[DB] warmRoutes - Error warming /api/names:', error);
      }
    }

    const warmDuration = Date.now() - warmStartTime;
    console.log('[DB] warmRoutes - Route warming completed:', JSON.stringify({
      function: 'warmRoutes',
      duration: `${warmDuration}ms`,
      routesWarmed: ['/api/wings', '/api/names']
    }, null, 2));
  } catch (error) {
    console.error('[DB] warmRoutes - Error warming routes:', error);
    // Don't throw - warming is non-critical
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

// Get or create user by rank, name, and wing
export async function getOrCreateUser(rank: string, name: string, wing: string): Promise<number> {
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      'SELECT id FROM users WHERE rank = $1 AND name = $2 AND wing = $3',
      [rank, name, wing]
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      console.log('[DB] getOrCreateUser - Retrieved existing user (first 3 rows):', JSON.stringify({
        function: 'getOrCreateUser',
        parameters: { rank, name, wing },
        result: { userId, action: 'retrieved' },
        data: result.rows.slice(0, 3)
      }, null, 2));
      return userId;
    }

    const insertResult = await client.query(
      'INSERT INTO users (rank, name, wing) VALUES ($1, $2, $3) RETURNING id',
      [rank, name, wing]
    );
    const newUserId = insertResult.rows[0].id;
    console.log('[DB] getOrCreateUser - Created new user (first 3 rows):', JSON.stringify({
      function: 'getOrCreateUser',
      parameters: { rank, name, wing },
      result: { userId: newUserId, action: 'created' },
      data: insertResult.rows.slice(0, 3)
    }, null, 2));
    return newUserId;
  } finally {
    client.release();
  }
}

// Get all ranks
export async function getRanks() {
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT value FROM ranks ORDER BY value');
    const rows = result.rows as Array<{ value: string }>;
    console.log('[DB] getRanks - Retrieved ranks (first 3 rows):', JSON.stringify({
      function: 'getRanks',
      parameters: {},
      result: { count: rows.length },
      data: rows.slice(0, 3)
    }, null, 2));
    return rows;
  } finally {
    client.release();
  }
}

// Get all wings
export async function getWings() {
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT value FROM wings ORDER BY value');
    const rows = result.rows as Array<{ value: string }>;
    console.log('[DB] getWings - Retrieved wings (first 3 rows):', JSON.stringify({
      function: 'getWings',
      parameters: {},
      result: { count: rows.length },
      data: rows.slice(0, 3)
    }, null, 2));
    return rows;
  } finally {
    client.release();
  }
}

// Get names by rank (returns empty array if no rank specified or no matches)
export async function getNamesByRank(rank?: string | null) {
  if (!rank) {
    console.log('[DB] getNamesByRank - No rank provided, returning empty array:', JSON.stringify({
      function: 'getNamesByRank',
      parameters: { rank: null },
      result: { count: 0 },
      data: []
    }, null, 2));
    return [];
  }
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      'SELECT DISTINCT name FROM name_rank_mappings WHERE rank = $1 ORDER BY name',
      [rank]
    );
    const rows = result.rows as Array<{ name: string }>;
    console.log('[DB] getNamesByRank - Retrieved names:', JSON.stringify({
      function: 'getNamesByRank',
      parameters: { rank },
      result: { count: rows.length },
      data: rows
    }, null, 2));
    return rows;
  } finally {
    client.release();
  }
}

// Get wings by rank and name (returns empty array if no matches)
export async function getWingsByRankAndName(rank?: string | null, name?: string | null) {
  if (!rank || !name) {
    console.log('[DB] getWingsByRankAndName - Missing parameters, returning empty array:', JSON.stringify({
      function: 'getWingsByRankAndName',
      parameters: { rank, name },
      result: { count: 0 },
      data: []
    }, null, 2));
    return [];
  }
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      'SELECT DISTINCT wing FROM name_rank_mappings WHERE rank = $1 AND name = $2 ORDER BY wing',
      [rank, name]
    );
    const rows = result.rows as Array<{ wing: string }>;
    console.log('[DB] getWingsByRankAndName - Retrieved wings (first 3 rows):', JSON.stringify({
      function: 'getWingsByRankAndName',
      parameters: { rank, name },
      result: { count: rows.length },
      data: rows.slice(0, 3)
    }, null, 2));
    return rows;
  } finally {
    client.release();
  }
}

// Get all exercises
export async function getExercises() {
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT * FROM exercises ORDER BY name');
    const rows = result.rows as Array<{ id: number; name: string; type: string; created_at: string }>;
    console.log('[DB] getExercises - Retrieved exercises (first 3 rows):', JSON.stringify({
      function: 'getExercises',
      parameters: {},
      result: { count: rows.length },
      data: rows.slice(0, 3)
    }, null, 2));
    return rows;
  } finally {
    client.release();
  }
}

// Get exercise by id
export async function getExerciseById(id: number) {
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT * FROM exercises WHERE id = $1', [id]);
    const row = result.rows[0] as { id: number; name: string; type: string; created_at: string } | undefined;
    console.log('[DB] getExerciseById - Retrieved exercise (first 3 rows):', JSON.stringify({
      function: 'getExerciseById',
      parameters: { id },
      result: { found: !!row },
      data: row ? [row] : null
    }, null, 2));
    return row;
  } finally {
    client.release();
  }
}

// Create a score
export async function createScore(userId: number, exerciseId: number, value: number) {
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    await client.query(
      'INSERT INTO scores (user_id, exercise_id, value) VALUES ($1, $2, $3)',
      [userId, exerciseId, value]
    );
  } finally {
    client.release();
  }
}

// Get leaderboard for a specific exercise (top N, sorted by highest rep, optionally filtered by wing)
export async function getLeaderboard(exerciseId: number, limit: number = 10, wing?: string | null) {
  checkDatabaseAvailable();
  await ensureInitialized();
  const client = await getPool().connect();
  try {
    let query = `
      SELECT 
        s.id,
        s.value,
        s.created_at,
        u.rank,
        u.name as user_name,
        u.wing,
        u.id as user_id
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE s.exercise_id = $1
    `;
    
    const params: any[] = [exerciseId];
    let paramIndex = 2;
    
    if (wing && wing !== 'OCS LEVEL') {
      query += ` AND u.wing = $${paramIndex}`;
      params.push(wing);
      paramIndex++;
    }
    
    query += ` ORDER BY s.value DESC, s.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await client.query(query, params);
    const rows = result.rows as Array<{
      id: number;
      value: number;
      created_at: string;
      rank: string | null;
      user_name: string;
      wing: string | null;
      user_id: number;
    }>;
    console.log('[DB] getLeaderboard - Retrieved leaderboard (first 3 rows):', JSON.stringify({
      function: 'getLeaderboard',
      parameters: { exerciseId, limit, wing: wing || null },
      result: { count: rows.length },
      data: rows.slice(0, 3)
    }, null, 2));
    return rows;
  } finally {
    client.release();
  }
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
    rank: string | null;
    user_name: string;
    wing: string | null;
    user_id: number;
  }> = [];

  const client = await getPool().connect();
  try {
    for (const exercise of exercises) {
      let query = `
        SELECT 
          s.id,
          s.value,
          s.created_at,
          u.rank,
          u.name as user_name,
          u.wing,
          u.id as user_id
        FROM scores s
        JOIN users u ON s.user_id = u.id
        WHERE s.exercise_id = $1
      `;
      
      const params: any[] = [exercise.id];
      let paramIndex = 2;
      
      if (wing && wing !== 'OCS LEVEL') {
        query += ` AND u.wing = $${paramIndex}`;
        params.push(wing);
        paramIndex++;
      }
      
      query += ` ORDER BY s.value DESC, s.created_at DESC LIMIT 1`;
      
      const result = await client.query(query, params);
      const row = result.rows[0] as {
        id: number;
        value: number;
        created_at: string;
        rank: string | null;
        user_name: string;
        wing: string | null;
        user_id: number;
      } | undefined;

      if (row) {
        results.push({
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          exercise_type: exercise.type,
          ...row,
        });
      }
    }
  } finally {
    client.release();
  }

  console.log('[DB] getExerciseBasedLeaderboard - Retrieved exercise-based leaderboard (first 3 rows):', JSON.stringify({
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
    rank: string | null;
    user_name: string;
    wing: string | null;
    user_id: number;
  }>> = {};

  for (const exercise of exercises) {
    leaderboards[exercise.name] = await getLeaderboard(exercise.id, limit, wing);
  }

  console.log('[DB] getAllLeaderboards - Retrieved all leaderboards (first 3 rows):', JSON.stringify({
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

export default getPool;
