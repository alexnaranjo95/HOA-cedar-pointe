/*
  # Add Address Gap Analysis Schema

  1. New Tables
    - `address_gaps`
      - `id` (uuid, primary key) - unique identifier
      - `property_id` (uuid, nullable) - link to property if verified
      - `street_number` (integer) - the missing address number
      - `street_name` (text) - street name (e.g., "SW 292nd St")
      - `full_address` (text) - complete address format
      - `gap_sequence` (text) - which sequence this gap belongs to
      - `is_confirmed_missing` (boolean) - manual verification status
      - `notes` (text) - research notes about the gap
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. New Tables
    - `address_analysis_results`
      - `id` (uuid, primary key)
      - `analysis_date` (timestamp) - when analysis was run
      - `total_properties` (integer) - total properties in Cedar Pointe
      - `total_gaps_found` (integer) - number of gaps in sequences
      - `verified_properties` (integer) - properties with confirmed data
      - `analysis_metadata` (jsonb) - stores detailed breakdown by street
      - `created_at` (timestamp)

  3. New Tables
    - `address_research_notes`
      - `id` (uuid, primary key)
      - `gap_id` (uuid) - reference to address gap
      - `research_status` (text) - 'not_started', 'in_progress', 'completed', 'confirmed_missing'
      - `gis_checked` (boolean) - checked in GIS system
      - `property_appraiser_checked` (boolean) - checked in county records
      - `public_records_found` (text) - findings from public data
      - `reason_for_gap` (text) - explanation if confirmed missing (water, easement, etc.)
      - `last_checked` (timestamp)
      - `created_by` (text)
      - `created_at` (timestamp)

  4. Security
    - Enable RLS on all new tables
    - Allow anonymous access for reading analysis results (public data)
    - Allow authenticated users full access for research updates

*/

-- Create address_gaps table
CREATE TABLE IF NOT EXISTS address_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  street_number integer NOT NULL,
  street_name text NOT NULL,
  full_address text NOT NULL,
  gap_sequence text NOT NULL,
  is_confirmed_missing boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE address_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view gaps"
  ON address_gaps FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can manage gaps"
  ON address_gaps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create address_analysis_results table
CREATE TABLE IF NOT EXISTS address_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date timestamptz DEFAULT now(),
  total_properties integer NOT NULL,
  total_gaps_found integer NOT NULL,
  verified_properties integer NOT NULL,
  analysis_metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE address_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view analysis results"
  ON address_analysis_results FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can create analysis"
  ON address_analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create address_research_notes table
CREATE TABLE IF NOT EXISTS address_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id uuid NOT NULL REFERENCES address_gaps(id) ON DELETE CASCADE,
  research_status text DEFAULT 'not_started',
  gis_checked boolean DEFAULT false,
  property_appraiser_checked boolean DEFAULT false,
  public_records_found text,
  reason_for_gap text,
  last_checked timestamptz,
  created_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE address_research_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view research notes"
  ON address_research_notes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can manage notes"
  ON address_research_notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_address_gaps_street_name ON address_gaps(street_name);
CREATE INDEX IF NOT EXISTS idx_address_gaps_street_number ON address_gaps(street_number);
CREATE INDEX IF NOT EXISTS idx_address_gaps_property_id ON address_gaps(property_id);
CREATE INDEX IF NOT EXISTS idx_address_research_notes_gap_id ON address_research_notes(gap_id);
CREATE INDEX IF NOT EXISTS idx_address_analysis_results_date ON address_analysis_results(analysis_date DESC);