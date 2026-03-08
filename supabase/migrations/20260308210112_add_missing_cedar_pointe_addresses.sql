/*
  # Add Missing Cedar Pointe Addresses

  1. New Addresses Added
    - SW 288th Ter: Complete sequential addresses 16204, 16206, 16208, 16210, 16212, 16214, 16216-16219, 16221-16223, 16226-16227, 16230-16231, 16233-16235, 16238-16239, 16241-16243, 16246-16247, 16250-16251, 16253
    - SW 162nd Ct: Add missing gap addresses 28831, 28863, 28879

  2. Changes
    - Inserted 33 new property records (30 for SW 288th Ter, 3 for SW 162nd Ct)
    - All new properties created with 'incomplete' status
    - Maintains referential integrity with existing database
*/

INSERT INTO properties (address, status) VALUES
  ('16204 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16206 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16208 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16210 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16212 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16214 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16216 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16217 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16218 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16219 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16221 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16222 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16223 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16226 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16227 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16230 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16231 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16233 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16234 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16235 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16238 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16239 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16241 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16242 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16243 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16246 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16247 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16250 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16251 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('16253 SW 288th Ter, Homestead, FL 33033', 'incomplete'),
  ('28831 SW 162nd Ct, Homestead, FL 33033', 'incomplete'),
  ('28863 SW 162nd Ct, Homestead, FL 33033', 'incomplete'),
  ('28879 SW 162nd Ct, Homestead, FL 33033', 'incomplete');
