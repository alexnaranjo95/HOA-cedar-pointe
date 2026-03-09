import { createClient } from '@supabase/supabase-js';
import { CEDAR_POINTE_ADDRESSES } from './src/data/addresses.js';

const coolifyUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(coolifyUrl, coolifyKey);

async function fixAll290() {
    console.log('🗑️ Deleting all records for 162xx SW 290th...');
    let totalDeleted = 0;

    // We do a large ilike to sweep up anything 162... on 290
    const { data: toDelete } = await supabase
        .from('properties')
        .select('id, address')
        .ilike('address', '162% SW 290%');

    if (toDelete && toDelete.length > 0) {
        for (const record of toDelete) {
            console.log(`Deleting: ${record.address}`);
            await supabase.from('properties').delete().eq('id', record.id);
            totalDeleted++;
        }
    }
    console.log(`🗑️ Deleted ${totalDeleted} potentially bad 290th properties.`);

    console.log('🏗️ Inserting correct versions from our master list...');

    // Filter master list for just the ones we want to re-add
    const correctAddresses = CEDAR_POINTE_ADDRESSES.filter(addr => addr.includes('162') && addr.includes('SW 290'));

    for (const address of correctAddresses) {
        console.log(`Inserting: ${address}`);
        // Insert as incomplete, gap sync will not mess with them now, and fetch-parcel-geometry will fill them eventually
        await supabase.from('properties').insert({
            address,
            status: 'incomplete'
        });
    }

    console.log('✅ 162xx SW 290th fully reset!');
    process.exit(0);
}

fixAll290();
