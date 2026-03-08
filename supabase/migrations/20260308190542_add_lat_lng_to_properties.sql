/*
  # Add latitude and longitude columns to properties

  1. Modified Tables
    - `properties`
      - Added `latitude` (double precision, nullable) - geocoded latitude coordinate
      - Added `longitude` (double precision, nullable) - geocoded longitude coordinate
      - Added `geocoded_at` (timestamptz, nullable) - timestamp of when coordinates were resolved

  2. Important Notes
    - These columns store real geocoded coordinates from a geocoding API
    - Properties with null lat/lng have not yet been geocoded
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE properties ADD COLUMN latitude double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE properties ADD COLUMN longitude double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'geocoded_at'
  ) THEN
    ALTER TABLE properties ADD COLUMN geocoded_at timestamptz;
  END IF;
END $$;
