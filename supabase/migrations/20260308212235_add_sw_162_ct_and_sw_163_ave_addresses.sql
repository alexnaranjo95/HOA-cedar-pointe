/*
  # Add SW 162 CT and SW 163 AVE Addresses

  1. New Addresses Added
    - SW 162 CT: 1 address (29228)
    - SW 163 AVE: 6 addresses (28882, 28900, 28924, 28948, 28802, 28834)

  2. Changes
    - Inserted 7 new property records
    - All created with 'incomplete' status
*/

INSERT INTO properties (address, status) VALUES
  ('29228 SW 162 CT, Miami, FL 33033', 'incomplete'),
  ('28882 SW 163 AVE, Miami, FL 33033', 'incomplete'),
  ('28900 SW 163 AVE, Miami, FL 33033', 'incomplete'),
  ('28924 SW 163 AVE, Miami, FL 33033', 'incomplete'),
  ('28948 SW 163 AVE, Miami, FL 33033', 'incomplete'),
  ('28802 SW 163 AVE, Miami, FL 33033', 'incomplete'),
  ('28834 SW 163 AVE, Miami, FL 33033', 'incomplete');
