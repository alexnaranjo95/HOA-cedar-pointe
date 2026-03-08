/*
  # Add Excluded Status to Properties

  1. Changes
    - Add 'excluded' as a valid status option for properties
    - Update the status check constraint to include 'excluded'

  2. Purpose
    - Allows marking properties as excluded from analysis
*/

ALTER TABLE properties DROP CONSTRAINT properties_status_check;

ALTER TABLE properties ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('verified', 'needs_review', 'incomplete', 'excluded'));

UPDATE properties SET status = 'excluded' 
WHERE address ILIKE '%28800 SW 163rd Ct%' OR address ILIKE '%28950 SW 163rd Ct%';
