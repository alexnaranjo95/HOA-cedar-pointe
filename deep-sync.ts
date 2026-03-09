import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeForComparison(addr: string | null) {
    if (!addr) return '';
    const tokens = addr.split(',')[0].toUpperCase().split(' ');
    const houseNum = tokens[0];
    const streetDir = tokens[1];
    const streetName = tokens[2] ? tokens[2].replace(/(\d+)(ST|ND|RD|TH)/g, '$1') : '';
    return `${houseNum} ${streetDir} ${streetName}`;
}

async function deepSync() {
    console.log('🚀 Starting Deep Sync from official GIS snapshots...');

    // 1. Load GIS Data
    const cedarData = JSON.parse(fs.readFileSync('gis_cedar_pointe_batch.json', 'utf8'));
    const neighborData = JSON.parse(fs.readFileSync('gis_neighbor_batch.json', 'utf8'));

    const officialFeatures = [...cedarData.features, ...neighborData.features];
    console.log(`📦 Loaded ${officialFeatures.length} official GIS records.`);

    // 2. Load DB Data
    const { data: dbProperties, error: dbError } = await supabase.from('properties').select('id, address');
    if (dbError || !dbProperties) {
        console.error('Error fetching properties from DB:', dbError);
        return;
    }
    console.log(`🏠 Currently ${dbProperties.length} properties in database.`);

    const matchedDbIds = new Set<string>();
    let updateCount = 0;
    let insertCount = 0;
    let ownerCount = 0;

    // 3. Process Official records
    for (const feature of officialFeatures) {
        const attrs = feature.attributes;
        const gisAddr = attrs.TRUE_SITE_ADDR;
        const normGis = normalizeForComparison(gisAddr);

        // Find match in DB
        const match = dbProperties.find(p => normalizeForComparison(p.address) === normGis);

        let propertyId: string;
        const cleanAddr = `${gisAddr.split(' ')[0]} ${gisAddr.split(' ').slice(1).join(' ').toLowerCase()} Homestead, FL 33033`
            .replace(/ sw /g, ' SW ')
            .replace(/ ter/g, ' Ter')
            .replace(/ st/g, ' St')
            .replace(/ ct/g, ' Ct')
            .replace(/ ave/g, ' Ave')
            .replace(/(\d+)\s+/, (match, p1) => {
                const n = parseInt(p1);
                if (n === 11 || n === 12 || n === 13) return `${n}th `;
                if (n % 10 === 1) return `${n}st `;
                if (n % 10 === 2) return `${n}nd `;
                if (n % 10 === 3) return `${n}rd `;
                return `${n}th `;
            });
        // Manual fix for "16249 sw 290 ter" -> "16249 SW 290th Ter"
        // Wait, normalizeForComparison is better for matching.

        // Use a more predictable formatting for the DB address
        const houseNum = gisAddr.split(' ')[0];
        const rest = gisAddr.split(' ').slice(1).join(' ');
        // Convert "SW 288 TER" to "SW 288th Ter"
        const formattedStreet = rest.split(' ').map(token => {
            if (/^\d+$/.test(token)) {
                const n = parseInt(token);
                let suffix = "th";
                if (n % 10 === 1 && n % 100 !== 11) suffix = "st";
                else if (n % 10 === 2 && n % 100 !== 12) suffix = "nd";
                else if (n % 10 === 3 && n % 100 !== 13) suffix = "rd";
                return token + suffix;
            }
            return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
        }).join(' ');
        const finalAddr = `${houseNum} ${formattedStreet}, Homestead, FL 33033`;

        if (match) {
            propertyId = match.id;
            matchedDbIds.add(propertyId);

            // Update existing
            await supabase.from('properties').update({
                parcel_number: attrs.FOLIO,
                address: finalAddr // Sythesize cleaner address from official source
            }).eq('id', propertyId);
            updateCount++;
        } else {
            // Insert new
            console.log(`➕ Adding missing property: ${finalAddr}`);
            const { data: newProp, error: insError } = await supabase.from('properties').insert({
                address: finalAddr,
                parcel_number: attrs.FOLIO,
                status: 'incomplete'
            }).select('id').single();

            if (insError || !newProp) {
                console.error(`Error inserting ${finalAddr}:`, insError);
                continue;
            }
            propertyId = newProp.id;
            insertCount++;
        }

        // Handle Owners
        const owners = [attrs.TRUE_OWNER1, attrs.TRUE_OWNER2, attrs.TRUE_OWNER3]
            .filter(o => o && o.trim() !== '');

        if (owners.length > 0) {
            await supabase.from('homeowners').delete().eq('property_id', propertyId);
            for (let j = 0; j < owners.length; j++) {
                await supabase.from('homeowners').insert({
                    property_id: propertyId,
                    owner_name: owners[j],
                    is_primary: j === 0,
                    owner_type: 'unknown'
                });
                ownerCount++;
            }
        }
    }

    // 4. Report Unmatched DB records
    const unmatched = dbProperties.filter(p => !matchedDbIds.has(p.id));
    if (unmatched.length > 0) {
        console.log(`\n⚠️ Found ${unmatched.length} properties in DB NOT matching official GIS:`);
        for (const p of unmatched) {
            console.log(`  - ${p.address}`);
            // Optional: delete them if desired? User said GIS is source of truth.
            // console.log(`  🗑️ Removing erroneous record: ${p.address}`);
            // await supabase.from('properties').delete().eq('id', p.id);
        }
    }

    console.log(`\n✨ Deep Sync Completed!`);
    console.log(`✅ Updated ${updateCount} properties.`);
    console.log(`➕ Inserted ${insertCount} missing properties.`);
    console.log(`🏠 Synced ${ownerCount} official owner records.`);
    process.exit(0);
}

deepSync();
