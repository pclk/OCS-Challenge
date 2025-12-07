import { prisma } from '../lib/prisma';
import { initDatabase } from '../lib/db';

/**
 * Script to reload data from CSV files into the database
 * 
 * This script will:
 * 1. Clear all existing data from tables
 * 2. Reload data from CSV files
 * 
 * Usage:
 *   Set DATABASE_URL environment variable
 *   Run: npx tsx scripts/reload-data.ts
 */

async function reloadData() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is required');
    console.error('Please set it in your environment variables or .env file');
    process.exit(1);
  }

  try {
    console.log('Starting data reload...\n');

    // Clear all data from tables (in correct order to respect foreign keys)
    console.log('Step 1: Clearing existing data...');
    
    await prisma.score.deleteMany({});
    console.log('  ✓ Cleared scores');
    
    await prisma.user.deleteMany({});
    console.log('  ✓ Cleared users');
    
    await prisma.nameRankMapping.deleteMany({});
    console.log('  ✓ Cleared name-wing mappings');
    
    await prisma.exercise.deleteMany({});
    console.log('  ✓ Cleared exercises');
    
    await prisma.wing.deleteMany({});
    console.log('  ✓ Cleared wings');
    
    console.log('\nStep 2: Reloading data from CSV files...\n');
    
    // Reload data from CSV files
    await initDatabase();
    
    console.log('\n✅ Data reload completed successfully!');

  } catch (error) {
    console.error('❌ Error during data reload:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reload
reloadData()
  .then(() => {
    console.log('\nData reload script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nData reload script failed:', error);
    process.exit(1);
  });

