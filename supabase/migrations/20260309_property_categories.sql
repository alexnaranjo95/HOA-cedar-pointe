/*
  # Add Property Categories

  1. New Columns
    - Adds `ownership_type` string column ('LLC_OWNED', 'OWNER_OCCUPIED', 'UNKNOWN') to `properties` table.
    - Adds `occupancy_type` string column ('SECTION_8', 'RENTER', 'HOMEOWNER_OCCUPIED', 'UNKNOWN') to `properties` table.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'ownership_type'
  ) THEN
    ALTER TABLE properties ADD COLUMN ownership_type text DEFAULT 'UNKNOWN' 
      CHECK (ownership_type IN ('LLC_OWNED', 'OWNER_OCCUPIED', 'UNKNOWN'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'occupancy_type'
  ) THEN
    ALTER TABLE properties ADD COLUMN occupancy_type text DEFAULT 'UNKNOWN'
      CHECK (occupancy_type IN ('SECTION_8', 'RENTER', 'HOMEOWNER_OCCUPIED', 'UNKNOWN'));
  END IF;
END $$;
