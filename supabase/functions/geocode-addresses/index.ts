import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function geocodeWithNominatim(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "CedarPointePropertyApp/1.0",
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data || data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: ungeocoded, error: fetchError } = await supabase
      .from("properties")
      .select("id, address")
      .is("latitude", null)
      .order("address")
      .limit(50);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ungeocoded || ungeocoded.length === 0) {
      return new Response(
        JSON.stringify({ message: "All properties are already geocoded", geocoded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let geocodedCount = 0;
    let failedCount = 0;
    const results: Array<{ id: string; address: string; status: string }> = [];

    for (const property of ungeocoded) {
      const coords = await geocodeWithNominatim(property.address);

      if (coords) {
        const { error: updateError } = await supabase
          .from("properties")
          .update({
            latitude: coords.lat,
            longitude: coords.lng,
            geocoded_at: new Date().toISOString(),
          })
          .eq("id", property.id);

        if (!updateError) {
          geocodedCount++;
          results.push({ id: property.id, address: property.address, status: "success" });
        } else {
          failedCount++;
          results.push({ id: property.id, address: property.address, status: "db_error" });
        }
      } else {
        failedCount++;
        results.push({ id: property.id, address: property.address, status: "not_found" });
      }

      await delay(1100);
    }

    return new Response(
      JSON.stringify({
        geocoded: geocodedCount,
        failed: failedCount,
        remaining: Math.max(0, (ungeocoded.length - geocodedCount - failedCount)),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
