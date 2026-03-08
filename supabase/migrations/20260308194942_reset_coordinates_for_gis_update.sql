/*
  # Reset Coordinates for GIS Update

  1. Changes
    - Clears all latitude, longitude, and geocoded_at values from properties
    - This allows the fetch-parcel-geometry edge function to repopulate
      all properties with accurate per-parcel coordinates from the
      Miami-Dade County GIS system
    - The previous Nominatim geocoding only resolved to street-level,
      causing many properties to stack on identical coordinates

  2. Important Notes
    - No columns or tables are dropped
    - Only data values are being nulled so they can be correctly repopulated
    - The geometry column remains untouched (already null for all rows)
*/

UPDATE properties
SET latitude = NULL,
    longitude = NULL,
    geocoded_at = NULL
WHERE latitude IS NOT NULL;
