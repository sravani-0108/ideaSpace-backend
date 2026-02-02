-- Fix for hackathons_status_enum already exists error
-- Run this SQL script in your PostgreSQL database to ensure the enum exists

-- Create the enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hackathons_status_enum') THEN
        CREATE TYPE "hackathons_status_enum" AS ENUM('PENDING', 'ACTIVE', 'COMPLETED');
    END IF;
END $$;

-- Verify the enum exists
SELECT typname, typtype FROM pg_type WHERE typname = 'hackathons_status_enum';

