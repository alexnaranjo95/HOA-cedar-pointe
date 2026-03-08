import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GIS_BASE_URL =
  "https://gisweb.miamidade.gov/arcgis/rest/services/MD_LandInformation/MapServer/26/query";

interface GISFeature {
  attributes: {
    FOLIO: string;
    TRUE_SITE_ADDR: string;
    LOT_SIZE: number;
  };
  geometry: {
    rings: number[][][];
  };
}

interface GISResponse {
  features?: GISFeature[];
  error?: { message: string };
}

interface DBProperty {
  id: string;
  address: string;
}

interface ParsedAddress {
  houseNumber: string;
  streetNumber: string;
  streetType: string;
  gisKey: string;
}

const STREET_TYPE_MAP: Record<string, string> = {
  CT: "CT",
  COURT: "CT",
  ST: "ST",
  STREET: "ST",
  AVE: "AVE",
  AVENUE: "AVE",
  TER: "TER",
  TERRACE: "TER",
  DR: "DR",
  DRIVE: "DR",
  PL: "PL",
  PLACE: "PL",
  PATH: "PATH",
};

function parseAddress(fullAddress: string): ParsedAddress | null {
  const beforeComma = fullAddress.split(",")[0].trim();
  const match = beforeComma.match(
    /^(\d+)\s+SW\s+(\d+)(?:st|nd|rd|th)?\s+(.+)/i,
  );
  if (!match) return null;

  const houseNumber = match[1];
  const streetNumber = match[2];
  const rawType = match[3].trim().toUpperCase();
  const streetType = STREET_TYPE_MAP[rawType] || rawType;
  const gisKey = `${houseNumber} SW ${streetNumber} ${streetType}`;

  return { houseNumber, streetNumber, streetType, gisKey };
}

function computeCentroid(rings: number[][][]): {
  lat: number;
  lng: number;
} {
  const ring = rings[0];
  let latSum = 0;
  let lngSum = 0;

  for (const [lng, lat] of ring) {
    latSum += lat;
    lngSum += lng;
  }

  return { lat: latSum / ring.length, lng: lngSum / ring.length };
}

function sqFeetToSqMeters(sqft: number): number {
  return Math.round(sqft * 0.092903 * 100) / 100;
}

async function queryGISByAddresses(
  gisKeys: string[],
): Promise<GISResponse> {
  const inList = gisKeys.map((k) => `'${k}'`).join(",");
  const where = `TRUE_SITE_ADDR IN (${inList})`;

  const body = new URLSearchParams({
    where,
    outFields: "FOLIO,TRUE_SITE_ADDR,LOT_SIZE",
    outSR: "4326",
    returnGeometry: "true",
    f: "json",
    resultRecordCount: "500",
  });

  const res = await fetch(GIS_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`GIS API returned ${res.status}`);
  }
  return res.json();
}

function buildGISLookup(
  features: GISFeature[],
): Map<string, GISFeature> {
  const lookup = new Map<string, GISFeature>();
  for (const feature of features) {
    const addr = feature.attributes.TRUE_SITE_ADDR.trim().toUpperCase();
    lookup.set(addr, feature);
  }
  return lookup;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: properties, error: fetchError } = await supabase
      .from("properties")
      .select("id, address")
      .is("geometry", null)
      .order("address");

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({
          message: "All properties already have parcel geometry",
          matched: 0,
          failed: 0,
          remaining: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed: Array<{ db: DBProperty; parsed: ParsedAddress }> = [];
    let failedCount = 0;

    for (const prop of properties) {
      const p = parseAddress(prop.address);
      if (!p) {
        failedCount++;
        continue;
      }
      parsed.push({ db: prop, parsed: p });
    }

    let matchedCount = 0;
    const BATCH_SIZE = 80;
    const batches: Array<typeof parsed> = [];
    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      batches.push(parsed.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      try {
        const gisKeys = batch.map((b) => b.parsed.gisKey);
        const gisData = await queryGISByAddresses(gisKeys);

        if (gisData.error || !gisData.features) {
          failedCount += batch.length;
          continue;
        }

        const lookup = buildGISLookup(gisData.features);

        for (const { db, parsed: addr } of batch) {
          const feature = lookup.get(addr.gisKey);

          if (!feature || !feature.geometry?.rings?.length) {
            failedCount++;
            continue;
          }

          const centroid = computeCentroid(feature.geometry.rings);
          const areaSqm = feature.attributes.LOT_SIZE
            ? sqFeetToSqMeters(feature.attributes.LOT_SIZE)
            : null;

          const { error: updateError } = await supabase
            .from("properties")
            .update({
              geometry: { rings: feature.geometry.rings },
              latitude: centroid.lat,
              longitude: centroid.lng,
              area_sqm: areaSqm,
              parcel_number: feature.attributes.FOLIO || null,
              geocoded_at: new Date().toISOString(),
            })
            .eq("id", db.id);

          if (updateError) {
            failedCount++;
          } else {
            matchedCount++;
          }
        }
      } catch (_err) {
        failedCount += batch.length;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const { count: remaining } = await supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .is("geometry", null);

    return new Response(
      JSON.stringify({
        matched: matchedCount,
        failed: failedCount,
        remaining: remaining || 0,
        totalProcessed: properties.length,
        batchesSent: batches.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
