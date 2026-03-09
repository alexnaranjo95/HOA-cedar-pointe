import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deduplicate() {
    console.log('🔍 Finding duplicates in properties table...');
    const { data: properties, error } = await supabase.from('properties').select('id, address');
    if (error || !properties) {
        console.error('Error fetching properties:', error);
        return;
    }

    const seen = new Map<string, string>();
    const dupes: string[] = [];

    for (const p of properties) {
        // Normalize address for comparison
        const norm = p.address.toLowerCase().trim();
        if (seen.has(norm)) {
            dupes.push(p.id);
            console.log(`Found dupe: ${p.address} (ID: ${p.id})`);
        } else {
            seen.set(norm, p.id);
        }
    }

    if (dupes.length > 0) {
        console.log(`🗑️ Deleting ${dupes.length} duplicates...`);
        // Note: cascading deletes homeowners/notes
        const { error: delError } = await supabase.from('properties').delete().in('id', dupes);
        if (delError) {
            console.error('Delete error:', delError);
        } else {
            console.log('✅ Duplicates removed.');
        }
    } else {
        console.log('✅ No duplicates found.');
    }
}

deduplicate();
