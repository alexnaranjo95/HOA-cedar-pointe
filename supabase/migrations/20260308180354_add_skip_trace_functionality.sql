/*
  # Skip Trace Functionality for BatchData Integration

  ## Overview
  This migration adds skip tracing functionality to track contact enrichment
  from BatchData API for property owners. Enables automatic contact discovery
  and verification tracking.

  ## 1. Table Modifications

  ### `homeowners` table - Add skip trace tracking columns
  - `skip_trace_status` (text) - Status: 'not_traced', 'in_progress', 'completed', 'failed'
  - `skip_trace_accuracy` (numeric) - Confidence score from BatchData (0.0 to 1.0)
  - `skip_traced_at` (timestamptz) - When skip trace was last performed
  - `verified_phone` (boolean) - Whether phone was verified by BatchData
  - `verified_email` (boolean) - Whether email was verified by BatchData
  - `phone_type` (text) - Type: 'mobile', 'landline', 'voip', 'unknown'
  - `alternate_phones` (jsonb) - Array of additional phone numbers with types
  - `alternate_emails` (jsonb) - Array of additional email addresses

  ## 2. New Tables

  ### `skip_trace_logs`
  Audit trail for all skip trace API calls and results
  - `id` (uuid, primary key) - Unique identifier
  - `homeowner_id` (uuid, foreign key) - Links to homeowners table
  - `property_id` (uuid, foreign key) - Links to properties table
  - `api_request` (jsonb) - Request payload sent to BatchData
  - `api_response` (jsonb) - Full response from BatchData API
  - `status` (text) - Result: 'success', 'failed', 'no_data'
  - `accuracy_score` (numeric) - Confidence score from response
  - `contacts_found` (integer) - Number of contacts discovered
  - `error_message` (text) - Error details if failed
  - `created_at` (timestamptz) - Timestamp of API call
  - `created_by` (text) - User who initiated the trace

  ### `skip_trace_contacts`
  Stores all contact options found from skip tracing
  - `id` (uuid, primary key) - Unique identifier
  - `homeowner_id` (uuid, foreign key) - Links to homeowners table
  - `contact_type` (text) - Type: 'phone', 'email'
  - `contact_value` (text) - The phone number or email address
  - `contact_subtype` (text) - For phones: 'mobile', 'landline', 'voip'
  - `verified` (boolean) - Whether BatchData verified this contact
  - `is_selected` (boolean) - Whether user selected this as primary contact
  - `dnc_listed` (boolean) - Do Not Call registry flag
  - `skip_trace_log_id` (uuid, foreign key) - Links to skip_trace_logs
  - `created_at` (timestamptz) - When contact was discovered

  ## 3. Security
  - Enable RLS on new tables
  - Add policies for authenticated users to manage skip trace data
  - Protect sensitive contact information

  ## 4. Indexes
  - Index on skip_trace_status for filtering
  - Index on homeowner_id in logs for quick lookups
  - Index on contact values for deduplication

  ## 5. Important Notes
  - Default skip_trace_status is 'not_traced'
  - Accuracy scores range from 0.0 (low confidence) to 1.0 (high confidence)
  - Multiple contacts stored in skip_trace_contacts table
  - API responses cached in skip_trace_logs for audit and cost tracking
*/

-- Add skip trace columns to homeowners table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'skip_trace_status'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN skip_trace_status text DEFAULT 'not_traced' 
      CHECK (skip_trace_status IN ('not_traced', 'in_progress', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'skip_trace_accuracy'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN skip_trace_accuracy numeric CHECK (skip_trace_accuracy >= 0 AND skip_trace_accuracy <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'skip_traced_at'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN skip_traced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'verified_phone'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN verified_phone boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'verified_email'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN verified_email boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'phone_type'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN phone_type text DEFAULT 'unknown'
      CHECK (phone_type IN ('mobile', 'landline', 'voip', 'unknown'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'alternate_phones'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN alternate_phones jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homeowners' AND column_name = 'alternate_emails'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN alternate_emails jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create skip_trace_logs table
CREATE TABLE IF NOT EXISTS skip_trace_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid REFERENCES homeowners(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  api_request jsonb NOT NULL,
  api_response jsonb,
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'no_data')),
  accuracy_score numeric CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  contacts_found integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'system'
);

-- Create skip_trace_contacts table
CREATE TABLE IF NOT EXISTS skip_trace_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid NOT NULL REFERENCES homeowners(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('phone', 'email')),
  contact_value text NOT NULL,
  contact_subtype text,
  verified boolean DEFAULT false,
  is_selected boolean DEFAULT false,
  dnc_listed boolean DEFAULT false,
  skip_trace_log_id uuid REFERENCES skip_trace_logs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_homeowners_skip_trace_status ON homeowners(skip_trace_status);
CREATE INDEX IF NOT EXISTS idx_skip_trace_logs_homeowner_id ON skip_trace_logs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_skip_trace_logs_property_id ON skip_trace_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_skip_trace_logs_created_at ON skip_trace_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skip_trace_contacts_homeowner_id ON skip_trace_contacts(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_skip_trace_contacts_value ON skip_trace_contacts(contact_value);

-- Enable Row Level Security
ALTER TABLE skip_trace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skip_trace_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view all skip trace logs"
  ON skip_trace_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert skip trace logs"
  ON skip_trace_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update skip trace logs"
  ON skip_trace_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete skip trace logs"
  ON skip_trace_logs FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all skip trace contacts"
  ON skip_trace_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert skip trace contacts"
  ON skip_trace_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update skip trace contacts"
  ON skip_trace_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete skip trace contacts"
  ON skip_trace_contacts FOR DELETE
  TO authenticated
  USING (true);