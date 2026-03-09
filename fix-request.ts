import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const coolifyUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(coolifyUrl, coolifyKey);

async function fixSpecific() {
    const gisData = JSON.parse(fs.readFileSync('gis_reinsert.json', 'utf8'));

    const addressesToProcess = [
        { codeAddr: '16343 SW 290th Ter, Homestead, FL 33033', gisAddr: '16343 SW 290 TER' },
        { codeAddr: '28802 SW 163rd Ave, Homestead, FL 33033', gisAddr: '28802 SW 163 AVE' },
        { codeAddr: '28834 SW 163rd Ave, Homestead, FL 33033', gisAddr: '28834 SW 163 AVE' },
        { codeAddr: '28850 SW 163rd Ave, Homestead, FL 33033', gisAddr: '28850 SW 163 AVE' },
    ];

    for (const item of addressesToProcess) {
        // Delete all old variants just in case
        console.log(`🗑️ Deleting any old records for: ${item.codeAddr.split(',')[0]}...`);
        // Extract basic street to delete e.g. "16343 SW 290" or "28802 SW 163"
        const addrTokens = item.codeAddr.split(' ');
        const baseSearch = `${addrTokens[0]} ${addrTokens[1]} ${addrTokens[2].substring(0, 3)}%`;
        await supabase.from('properties').delete().ilike('address', baseSearch);

        // Find the GIS feature
        const feature = gisData.features.find((f: any) => f.attributes.TRUE_SITE_ADDR === item.gisAddr);

        if (feature) {
            console.log(`✅ Found GIS data for ${item.gisAddr}`);
            const rings = feature.geometry.rings;

            // Calc fake centroid from first point to have lat/lng
            let centroidLat = rings[0][0][1];
            let centroidLng = rings[0][0][0];

            console.log(`🏗️ Inserting correct record: ${item.codeAddr}`);
            const { error } = await supabase.from('properties').insert({
                address: item.codeAddr,
                geometry: { rings },
                latitude: centroidLat,
                longitude: centroidLng,
                parcel_number: feature.attributes.FOLIO,
                status: 'incomplete'
            });

            if (error) {
                console.error('Insert error:', error);
            }
        } else {
            console.error(`❌ Could not find GIS data for ${item.gisAddr}`);
        }
    }

    console.log('✅ Specific addresses fully reset and inserted!');
    process.exit(0);
}

fixSpecific();
