import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'leaderboard.db');
const db = new Database(dbPath);

// Initialize database schema
export function initDatabase() {
  // Create exercises table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('rep', 'seconds')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
  `);

  // Seed initial exercises if they don't exist
  const exerciseCount = db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };
  
  if (exerciseCount.count === 0) {
    const insertExercise = db.prepare('INSERT INTO exercises (name, type) VALUES (?, ?)');
    insertExercise.run('Burpees', 'rep');
    insertExercise.run('Push-ups', 'rep');
  }
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

