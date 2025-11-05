import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'leaderboard.db');
const db = new Database(dbPath);

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
export function initDatabase() {
  // Create ranks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ranks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create wings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS wings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create exercises table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('rep', 'seconds')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create name_rank_mappings table (includes wing for validation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS name_rank_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rank TEXT NOT NULL,
      wing TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, rank, wing)
    )
  `);

  // Migrate name_rank_mappings table if it doesn't have wing column
  try {
    db.exec(`ALTER TABLE name_rank_mappings ADD COLUMN wing TEXT`);
    // If we added the column, we need to handle existing data
    // For now, we'll just let new inserts work correctly
  } catch (e) {
    // Column already exists, ignore
  }

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rank TEXT,
      name TEXT NOT NULL,
      wing TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate existing users table if it doesn't have rank and wing columns
  try {
    db.exec(`ALTER TABLE users ADD COLUMN rank TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN wing TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create scores table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      value INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )
  `);

  // Create indexes for better query performance
  db.exec(`
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
  const insertRank = db.prepare('INSERT OR IGNORE INTO ranks (value) VALUES (?)');
  ranks.forEach(rank => {
    if (rank.value) insertRank.run(rank.value);
  });

  // Insert wings
  const insertWing = db.prepare('INSERT OR IGNORE INTO wings (value) VALUES (?)');
  wings.forEach(wing => {
    if (wing.value) insertWing.run(wing.value);
  });

  // Insert exercises
  const insertExercise = db.prepare('INSERT OR IGNORE INTO exercises (name, type) VALUES (?, ?)');
  exercises.forEach(exercise => {
    if (exercise.name && exercise.type) {
      insertExercise.run(exercise.name, exercise.type);
    }
  });

  // Insert name-rank-wing mappings
  const insertNameRank = db.prepare('INSERT OR IGNORE INTO name_rank_mappings (name, rank, wing) VALUES (?, ?, ?)');
  personnel.forEach(person => {
    if (person.name && person.rank && person.wing) {
      insertNameRank.run(person.name, person.rank, person.wing);
    }
  });
}

// Initialize database on module load
initDatabase();

// Get or create user by rank, name, and wing
export function getOrCreateUser(rank: string, name: string, wing: string): number {
  const getUser = db.prepare('SELECT id FROM users WHERE rank = ? AND name = ? AND wing = ?');
  const user = getUser.get(rank, name, wing) as { id: number } | undefined;

  if (user) {
    return user.id;
  }

  const createUser = db.prepare('INSERT INTO users (rank, name, wing) VALUES (?, ?, ?)');
  const result = createUser.run(rank, name, wing);
  return result.lastInsertRowid as number;
}

// Get all ranks
export function getRanks() {
  const stmt = db.prepare('SELECT value FROM ranks ORDER BY value');
  return stmt.all() as Array<{ value: string }>;
}

// Get all wings
export function getWings() {
  const stmt = db.prepare('SELECT value FROM wings ORDER BY value');
  return stmt.all() as Array<{ value: string }>;
}

// Get names by rank (returns empty array if no rank specified or no matches)
export function getNamesByRank(rank?: string | null) {
  if (!rank) {
    return [];
  }
  const stmt = db.prepare('SELECT DISTINCT name FROM name_rank_mappings WHERE rank = ? ORDER BY name');
  return stmt.all(rank) as Array<{ name: string }>;
}

// Get wings by rank and name (returns empty array if no matches)
export function getWingsByRankAndName(rank?: string | null, name?: string | null) {
  if (!rank || !name) {
    return [];
  }
  const stmt = db.prepare('SELECT DISTINCT wing FROM name_rank_mappings WHERE rank = ? AND name = ? ORDER BY wing');
  return stmt.all(rank, name) as Array<{ wing: string }>;
}

// Get all exercises
export function getExercises() {
  const stmt = db.prepare('SELECT * FROM exercises ORDER BY name');
  return stmt.all() as Array<{ id: number; name: string; type: string; created_at: string }>;
}

// Get exercise by id
export function getExerciseById(id: number) {
  const stmt = db.prepare('SELECT * FROM exercises WHERE id = ?');
  return stmt.get(id) as { id: number; name: string; type: string; created_at: string } | undefined;
}

// Create a score
export function createScore(userId: number, exerciseId: number, value: number) {
  const stmt = db.prepare('INSERT INTO scores (user_id, exercise_id, value) VALUES (?, ?, ?)');
  return stmt.run(userId, exerciseId, value);
}

// Get leaderboard for a specific exercise (top N, sorted by highest rep, optionally filtered by wing)
export function getLeaderboard(exerciseId: number, limit: number = 10, wing?: string | null) {
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
    WHERE s.exercise_id = ?
  `;
  
  const params: any[] = [exerciseId];
  
  if (wing && wing !== 'OCS LEVEL') {
    query += ` AND u.wing = ?`;
    params.push(wing);
  }
  
  query += ` ORDER BY s.value DESC, s.created_at DESC LIMIT ?`;
  params.push(limit);
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as Array<{
    id: number;
    value: number;
    created_at: string;
    rank: string | null;
    user_name: string;
    wing: string | null;
    user_id: number;
  }>;
}

// Get exercise-based leaderboard (highest rep per exercise, optionally filtered by wing)
export function getExerciseBasedLeaderboard(wing?: string | null) {
  const exercises = getExercises();
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
      WHERE s.exercise_id = ?
    `;
    
    const params: any[] = [exercise.id];
    
    if (wing && wing !== 'OCS LEVEL') {
      query += ` AND u.wing = ?`;
      params.push(wing);
    }
    
    query += ` ORDER BY s.value DESC, s.created_at DESC LIMIT 1`;
    
    const stmt = db.prepare(query);
    const result = stmt.get(...params) as {
      id: number;
      value: number;
      created_at: string;
      rank: string | null;
      user_name: string;
      wing: string | null;
      user_id: number;
    } | undefined;

    if (result) {
      results.push({
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        exercise_type: exercise.type,
        ...result,
      });
    }
  }

  return results;
}

// Get leaderboard for all exercises (optionally filtered by wing)
export function getAllLeaderboards(limit: number = 10, wing?: string | null) {
  const exercises = getExercises();
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
    leaderboards[exercise.name] = getLeaderboard(exercise.id, limit, wing);
  }

  return leaderboards;
}

export default db;

