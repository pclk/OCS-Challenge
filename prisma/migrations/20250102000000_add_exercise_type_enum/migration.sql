-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "ExerciseType" AS ENUM ('rep', 'seconds');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

