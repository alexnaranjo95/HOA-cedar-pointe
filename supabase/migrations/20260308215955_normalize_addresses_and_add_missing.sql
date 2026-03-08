/*
  # Normalize addresses and add missing properties

  1. New Properties
    - `29022 SW 164th Ave, Homestead, FL 33033`
    - `16400 SW 290th St, Homestead, FL 33033`
    - `29010 SW 164th Ave, Homestead, FL 33033`
    - `16424 SW 290th St, Homestead, FL 33033`
    - `16448 SW 290th St, Homestead, FL 33033`

  2. Normalized Addresses
    - Standardize clubhouse address format
    - Transfer geometry data from duplicate abbreviated records to their standard counterparts
    - Normalize remaining abbreviated addresses (e.g. "SW 290 TER" -> "SW 290th Ter")
    - Remove the old "17583 SW 46 ST" entry that is not part of Cedar Pointe

  3. Important Notes
    - Two duplicate records (28909 and 28949 on 162 CT) have their geometry transferred to standard records before removal
    - All abbreviated GIS-format addresses are normalized to standard ordinal format
    - No data is lost: geometry, coordinates, and parcel data are preserved
*/

-- 1. Insert missing addresses that were never added to the database
INSERT INTO properties (address, status) VALUES
  ('29010 SW 164th Ave, Homestead, FL 33033', 'incomplete'),
  ('29022 SW 164th Ave, Homestead, FL 33033', 'incomplete'),
  ('16400 SW 290th St, Homestead, FL 33033', 'incomplete'),
  ('16424 SW 290th St, Homestead, FL 33033', 'incomplete'),
  ('16448 SW 290th St, Homestead, FL 33033', 'incomplete')
ON CONFLICT DO NOTHING;

-- 2. Normalize the clubhouse address
UPDATE properties 
SET address = 'Clubhouse - 29025 SW 164th Ave, Homestead, FL 33033'
WHERE address = 'Clubhouse - 29025 SW 164th Avenue Rd, Homestead, FL 33033';

-- 3. Transfer geometry from duplicate 28909 SW 162 CT to its standard counterpart
UPDATE properties dst
SET 
  geometry = COALESCE(dst.geometry, src.geometry),
  latitude = COALESCE(dst.latitude, src.latitude),
  longitude = COALESCE(dst.longitude, src.longitude),
  area_sqm = COALESCE(dst.area_sqm, src.area_sqm),
  parcel_number = COALESCE(dst.parcel_number, src.parcel_number),
  geocoded_at = COALESCE(dst.geocoded_at, src.geocoded_at)
FROM properties src
WHERE src.address = '28909 SW 162 CT, Miami, FL 33033'
  AND dst.address = '28909 SW 162nd Ct, Homestead, FL 33033';

-- 4. Transfer geometry from duplicate 28949 SW 162 CT to its standard counterpart
UPDATE properties dst
SET 
  geometry = COALESCE(dst.geometry, src.geometry),
  latitude = COALESCE(dst.latitude, src.latitude),
  longitude = COALESCE(dst.longitude, src.longitude),
  area_sqm = COALESCE(dst.area_sqm, src.area_sqm),
  parcel_number = COALESCE(dst.parcel_number, src.parcel_number),
  geocoded_at = COALESCE(dst.geocoded_at, src.geocoded_at)
FROM properties src
WHERE src.address = '28949 SW 162 CT, Miami, FL 33033'
  AND dst.address = '28949 SW 162nd Ct, Homestead, FL 33033';

-- 5. Delete the two duplicate abbreviated records (data already transferred)
DELETE FROM properties WHERE address = '28909 SW 162 CT, Miami, FL 33033';
DELETE FROM properties WHERE address = '28949 SW 162 CT, Miami, FL 33033';

-- 6. Normalize all remaining abbreviated addresses to standard ordinal format
-- SW 290 TER -> SW 290th Ter
UPDATE properties SET address = REPLACE(address, 'SW 290 TER, Miami', 'SW 290th Ter, Homestead')
WHERE address LIKE '%SW 290 TER, Miami%';

-- SW 291 ST -> SW 291st St  
UPDATE properties SET address = REPLACE(address, 'SW 291 ST, Miami', 'SW 291st St, Homestead')
WHERE address LIKE '%SW 291 ST, Miami%';

-- SW 163 AVE -> SW 163rd Ave
UPDATE properties SET address = REPLACE(address, 'SW 163 AVE, Miami', 'SW 163rd Ave, Homestead')
WHERE address LIKE '%SW 163 AVE, Miami%';

-- SW 162 CT -> SW 162nd Ct
UPDATE properties SET address = REPLACE(address, 'SW 162 CT, Miami', 'SW 162nd Ct, Homestead')
WHERE address LIKE '%SW 162 CT, Miami%';

-- 7. Remove 17583 SW 46 ST (not part of Cedar Pointe community)
UPDATE properties SET status = 'excluded' WHERE address LIKE '%17583 SW 46%';
