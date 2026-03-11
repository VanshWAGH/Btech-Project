-- Add first_name and last_name to users table if they don't exist
-- Run this in Neon SQL Editor or: psql $DATABASE_URL -f migrations/0001_add_user_name_columns.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN first_name character varying;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_name character varying;
  END IF;
END $$;
