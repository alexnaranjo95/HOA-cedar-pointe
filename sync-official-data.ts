import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncOfficialData() {
    console.log('🔄 Starting full sync from Miami-Dade GIS API...');

    // 1. Fetch all properties from Supabase
    const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, address');

    if (propError || !properties) {
        console.error('❌ Error fetching properties:', propError);
        return;
    }

    console.log(`📦 Found ${properties.length} properties to check.`);

    let updatedCount = 0;
    let ownerCount = 0;

    // Process in batches of 50 to avoid URL length issues or timeouts
    const batchSize = 50;
    for (let i = 0; i < properties.length; i += batchSize) {
        const batch = properties.slice(i, i + batchSize);
        console.log(`📡 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(properties.length / batchSize)}...`);

        // Prepare the addresses for the GIS query
        // Miami-Dade GIS TRUE_SITE_ADDR format is typically "16249 SW 290 TER" (uppercase, no zip)
        const likeClauses = batch.map(p => {
            const tokens = p.address.split(',')[0].toUpperCase().split(' ');
            return `TRUE_SITE_ADDR LIKE '${tokens[0]} ${tokens[1]} ${tokens[2].replace(/(\d+)(ST|ND|RD|TH)/g, '$1')}%'`;
        });

        const whereClause = likeClauses.join(' OR ');
        const gisUrl = `https://gisweb.miamidade.gov/arcgis/rest/services/MD_LandInformation/MapServer/26/query`;

        try {
            const params = new URLSearchParams({
                where: whereClause,
                outFields: 'FOLIO,TRUE_SITE_ADDR,TRUE_OWNER1,TRUE_OWNER2,TRUE_OWNER3',
                outSR: '4326',
                f: 'json'
            });

            const response = await fetch(gisUrl, {
                method: 'POST',
                body: params
            });

            if (!response.ok) {
                console.error(`❌ GIS API Error for batch: ${response.statusText}`);
                continue;
            }

            const gisData = await response.json();

            if (gisData.features) {
                for (const feature of gisData.features) {
                    const attrs = feature.attributes;
                    const folio = attrs.FOLIO;
                    const gisAddr = attrs.TRUE_SITE_ADDR;

                    // Match by House Number + basic street name (wildcarding suffix)
                    const property = batch.find(p => {
                        const dbAddrTokens = p.address.split(',')[0].toUpperCase().split(' ');
                        const houseNum = dbAddrTokens[0];
                        const streetDir = dbAddrTokens[1];
                        const streetName = dbAddrTokens[2].replace(/(\d+)(ST|ND|RD|TH)/g, '$1');

                        const gisTokens = gisAddr.split(' ');
                        const gisHouse = gisTokens[0];
                        const gisDir = gisTokens[1];
                        const gisStreet = gisTokens[2];

                        return houseNum === gisHouse && streetDir === gisDir && streetName === gisStreet;
                    });

                    if (property) {
                        // Update Property Folio
                        await supabase.from('properties').update({
                            parcel_number: folio
                        }).eq('id', property.id);

                        updatedCount++;

                        // Handle Owners
                        const owners = [attrs.TRUE_OWNER1, attrs.TRUE_OWNER2, attrs.TRUE_OWNER3]
                            .filter(o => o && o.trim() !== '');

                        if (owners.length > 0) {
                            // Delete existing homeowners for this property to ensure fresh official data
                            await supabase.from('homeowners').delete().eq('property_id', property.id);

                            for (let j = 0; j < owners.length; j++) {
                                await supabase.from('homeowners').insert({
                                    property_id: property.id,
                                    owner_name: owners[j],
                                    is_primary: j === 0,
                                    owner_type: 'unknown'
                                });
                                ownerCount++;
                            }
                        }
                    }
                }
            }

            // Check for failed matches in this batch to log them
            batch.forEach(p => {
                const matched = gisData.features?.some((f: any) => {
                    const gisAddr = f.attributes.TRUE_SITE_ADDR;
                    const dbAddrTokens = p.address.split(',')[0].toUpperCase().split(' ');
                    const houseNum = dbAddrTokens[0];
                    const streetDir = dbAddrTokens[1];
                    const streetName = dbAddrTokens[2].replace(/(\d+)(ST|ND|RD|TH)/g, '$1');

                    const gisTokens = gisAddr.split(' ');
                    const gisHouse = gisTokens[0];
                    const gisDir = gisTokens[1];
                    const gisStreet = gisTokens[2];

                    return houseNum === gisHouse && streetDir === gisDir && streetName === gisStreet;
                });

                if (!matched) {
                    // console.log(`⚠️  Could not match property: ${p.address}`);
                }
            });
        } catch (err) {
            console.error('❌ Error processing batch:', err);
        }
    }

    console.log(`\n✨ Sync Completed!`);
    console.log(`✅ Updated ${updatedCount} property folios.`);
    console.log(`🏠 Synced ${ownerCount} official owner names.`);
    process.exit(0);
}

syncOfficialData();
