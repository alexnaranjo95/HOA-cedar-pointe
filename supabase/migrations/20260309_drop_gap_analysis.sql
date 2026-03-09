/*
  # Drop Address Gap Analysis Schema

  1. Changes
    - Drop `address_research_notes` table
    - Drop `address_analysis_results` table
    - Drop `address_gaps` table
*/

DROP TABLE IF EXISTS address_research_notes CASCADE;
DROP TABLE IF EXISTS address_analysis_results CASCADE;
DROP TABLE IF EXISTS address_gaps CASCADE;
