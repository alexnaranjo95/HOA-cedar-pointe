/*
  # Cedar Pointe Homeowner Management System Schema

  ## Overview
  This migration creates the database schema for managing homeowner information
  for the Cedar Pointe community in Homestead, FL. The system tracks properties,
  their owners, and communication history.

  ## 1. New Tables

  ### `properties`
  Stores property parcel information from the property appraiser's GIS system
  - `id` (uuid, primary key) - Unique identifier
  - `object_id` (integer) - ArcGIS OBJECTID from the source data
  - `ttrrss` (text) - Township/Range/Section identifier
  - `parcel_number` (text) - Property parcel number
  - `address` (text) - Street address
  - `geometry` (jsonb) - GeoJSON polygon coordinates for the parcel
  - `area_sqm` (numeric) - Lot area in square meters
  - `status` (text) - Data verification status: 'verified', 'needs_review', 'incomplete'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `homeowners`
  Stores contact and identification information for property owners
  - `id` (uuid, primary key) - Unique identifier
  - `property_id` (uuid, foreign key) - Links to properties table
  - `owner_name` (text) - Full name of the property owner
  - `phone` (text) - Primary phone number
  - `email` (text) - Email address
  - `mailing_address` (text) - Mailing address if different from property
  - `owner_type` (text) - Type: 'owner_occupied', 'rental', 'investment', 'unknown'
  - `is_primary` (boolean) - Indicates primary owner for properties with multiple owners
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `notes`
  Tracks all communications and notes related to properties
  - `id` (uuid, primary key) - Unique identifier
  - `property_id` (uuid, foreign key) - Links to properties table
  - `note_text` (text) - Content of the note or communication log
  - `category` (text) - Note type: 'contacted', 'no_response', 'opted_out', 'general', 'follow_up'
  - `created_at` (timestamptz) - Note creation timestamp
  - `created_by` (text) - User who created the note

  ## 2. Security
  - Enable Row Level Security (RLS) on all tables
  - Add policies for authenticated users to manage all community data
  - This is a single-user community management system

  ## 3. Indexes
  - Index on property addresses for search functionality
  - Index on homeowner names for quick lookups
  - Index on property_id in notes table for efficient querying

  ## 4. Important Notes
  - All properties start with 'incomplete' status until verified
  - Default owner_type is 'unknown' until confirmed
  - Timestamps use timestamptz for proper timezone handling
  - Geometry stored as JSONB for flexibility with mapping libraries
*/

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id integer UNIQUE,
  ttrrss text,
  parcel_number text,
  address text NOT NULL,
  geometry jsonb,
  area_sqm numeric,
  status text DEFAULT 'incomplete' CHECK (status IN ('verified', 'needs_review', 'incomplete')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create homeowners table
CREATE TABLE IF NOT EXISTS homeowners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  phone text,
  email text,
  mailing_address text,
  owner_type text DEFAULT 'unknown' CHECK (owner_type IN ('owner_occupied', 'rental', 'investment', 'unknown')),
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('contacted', 'no_response', 'opted_out', 'general', 'follow_up')),
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'system'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_address ON properties(address);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_homeowners_property_id ON homeowners(property_id);
CREATE INDEX IF NOT EXISTS idx_homeowners_name ON homeowners(owner_name);
CREATE INDEX IF NOT EXISTS idx_notes_property_id ON notes(property_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowners ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to manage all data
CREATE POLICY "Authenticated users can view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all homeowners"
  ON homeowners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert homeowners"
  ON homeowners FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update homeowners"
  ON homeowners FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete homeowners"
  ON homeowners FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all notes"
  ON notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete notes"
  ON notes FOR DELETE
  TO authenticated
  USING (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_homeowners_updated_at ON homeowners;
CREATE TRIGGER update_homeowners_updated_at
  BEFORE UPDATE ON homeowners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();