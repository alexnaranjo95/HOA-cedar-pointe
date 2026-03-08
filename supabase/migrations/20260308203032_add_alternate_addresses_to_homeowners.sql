/*
  # Add alternate addresses storage to homeowners

  1. New Column
    - `alternate_addresses` (jsonb) - Stores previous/alternate mailing addresses from skip trace

  2. Changes
    - Adds field to capture all mailing address history returned from skip trace API
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'alternate_addresses'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN alternate_addresses jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
