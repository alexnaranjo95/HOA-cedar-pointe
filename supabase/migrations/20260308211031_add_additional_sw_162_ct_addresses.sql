/*
  # Add Additional SW 162 CT Addresses

  1. New Addresses Added
    - SW 162 CT: Add 10 additional addresses (28909, 28917, 28949, 28993, 29001, 29005, 29041, 29051, 29061, 29091)

  2. Changes
    - Inserted 10 new property records for SW 162 CT
    - All new properties created with 'incomplete' status
    - Maintains referential integrity with existing database
*/

INSERT INTO properties (address, status) VALUES
  ('28909 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('28917 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('28949 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('28993 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('29001 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('29005 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('29041 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('29051 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('29061 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('29091 SW 162 CT, Miami, FL 33033', 'incomplete');
