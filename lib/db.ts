import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Create PostgreSQL connection pool
// For Railway production: DATABASE_URL is automatically set by Railway
// For local development: Use Railway's public connection string or set DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

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

// Initialize database schema
export async function initDatabase() {
  const client = await pool.connect();
  try {
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
    } catch (e: any) {
      // Column already exists, ignore (PostgreSQL error code 42701)
      if (e.code !== '42701') {
        throw e;
      }
    }

    try {
      await client.query(`ALTER TABLE users ADD COLUMN wing TEXT`);
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

    // Load ranks from ranks.csv
    const ranksPath = path.join(process.cwd(), 'data', 'ranks.csv');
    const ranks = parseCSV<{ value: string }>(ranksPath);

    // Load wings from wings.csv
    const wingsPath = path.join(process.cwd(), 'data', 'wings.csv');
    const wings = parseCSV<{ value: string }>(wingsPath);

    // Load personnel from personnel.csv
    const personnelPath = path.join(process.cwd(), 'data', 'personnel.csv');
    const personnel = parseCSV<{ rank: string; name: string; wing: string }>(personnelPath);
    
    // Load exercises from exercise.csv
    const exercisePath = path.join(process.cwd(), 'data', 'exercise.csv');
    const exercises = parseCSV<{ name: string; type: string }>(exercisePath);

    // Insert ranks
    for (const rank of ranks) {
      if (rank.value) {
        await client.query('INSERT INTO ranks (value) VALUES ($1) ON CONFLICT (value) DO NOTHING', [rank.value]);
      }
    }

    // Insert wings
    for (const wing of wings) {
      if (wing.value) {
        await client.query('INSERT INTO wings (value) VALUES ($1) ON CONFLICT (value) DO NOTHING', [wing.value]);
      }
    }

    // Insert exercises
    for (const exercise of exercises) {
      if (exercise.name && exercise.type) {
        await client.query('INSERT INTO exercises (name, type) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [exercise.name, exercise.type]);
      }
    }

    // Insert name-rank-wing mappings
    for (const person of personnel) {
      if (person.name && person.rank && person.wing) {
        await client.query('INSERT INTO name_rank_mappings (name, rank, wing) VALUES ($1, $2, $3) ON CONFLICT (name, rank, wing) DO NOTHING', [person.name, person.rank, person.wing]);
      }
    }
  } finally {
    client.release();
  }
}

// Initialize database (lazy initialization)
let initPromise: Promise<void> | null = null;
let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized && !initPromise) {
    initPromise = initDatabase();
    await initPromise;
    isInitialized = true;
  } else if (initPromise) {
    await initPromise;
  }
}

// Get or create user by rank, name, and wing
export async function getOrCreateUser(rank: string, name: string, wing: string): Promise<number> {
  await ensureInitialized();
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id FROM users WHERE rank = $1 AND name = $2 AND wing = $3',
      [rank, name, wing]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    const insertResult = await client.query(
      'INSERT INTO users (rank, name, wing) VALUES ($1, $2, $3) RETURNING id',
      [rank, name, wing]
    );
    return insertResult.rows[0].id;
  } finally {
    client.release();
  }
}

// Get all ranks
export async function getRanks() {
  await ensureInitialized();
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT value FROM ranks ORDER BY value');
    return result.rows as Array<{ value: string }>;
  } finally {
    client.release();
  }
}

// Get all wings
export async function getWings() {
  await ensureInitialized();
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT value FROM wings ORDER BY value');
    return result.rows as Array<{ value: string }>;
  } finally {
    client.release();
  }
}

// Get names by rank (returns empty array if no rank specified or no matches)
export async function getNamesByRank(rank?: string | null) {
  if (!rank) {
    return [];
  }
  await ensureInitialized();
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT DISTINCT name FROM name_rank_mappings WHERE rank = $1 ORDER BY name',
      [rank]
    );
    return result.rows as Array<{ name: string }>;
  } finally {
    client.release();
  }
}

// Get wings by rank and name (returns empty array if no matches)
export async function getWingsByRankAndName(rank?: string | null, name?: string | null) {
  if (!rank || !name) {
    return [];
  }
  await ensureInitialized();
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT DISTINCT wing FROM name_rank_mappings WHERE rank = $1 AND name = $2 ORDER BY wing',
      [rank, name]
    );
    return result.rows as Array<{ wing: string }>;
  } finally {
    client.release();
  }
}

// Get all exercises
export async function getExercises() {
  await ensureInitialized();
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM exercises ORDER BY name');
    return result.rows as Array<{ id: number; name: string; type: string; created_at: string }>;
  } finally {
    client.release();
  }
}

// Get exercise by id
export async function getExerciseById(id: number) {
  await ensureInitialized();
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM exercises WHERE id = $1', [id]);
    return result.rows[0] as { id: number; name: string; type: string; created_at: string } | undefined;
  } finally {
    client.release();
  }
}

// Create a score
export async function createScore(userId: number, exerciseId: number, value: number) {
  await ensureInitialized();
  const client = await pool.connect();
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
  await ensureInitialized();
  const client = await pool.connect();
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
    return result.rows as Array<{
      id: number;
      value: number;
      created_at: string;
      rank: string | null;
      user_name: string;
      wing: string | null;
      user_id: number;
    }>;
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

  const client = await pool.connect();
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

  return leaderboards;
}

export default pool;
