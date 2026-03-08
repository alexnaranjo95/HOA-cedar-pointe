/*
  # Add SW 163 AVE and SW 290 TER Addresses

  1. New Addresses Added
    - SW 163 AVE: 2 addresses (29020, 29028)
    - SW 290 TER: 1 address (16343)

  2. Changes
    - Inserted 3 new property records
    - All created with 'incomplete' status
*/

INSERT INTO properties (address, status) VALUES
  ('29020 SW 163 AVE, Miami, FL 33033', 'incomplete'),
  ('29028 SW 163 AVE, Miami, FL 33033', 'incomplete'),
  ('16343 SW 290 TER, Miami, FL 33033', 'incomplete');
