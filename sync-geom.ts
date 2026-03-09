import { createClient } from '@supabase/supabase-js';

const coolifyUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(coolifyUrl, coolifyKey);

async function fetchGeometry() {
    console.log('Fetching geometries for new 290th Ter addresses...');
    const { error } = await supabase.functions.invoke('fetch-parcel-geometry');
    if (error) {
        console.error('Error invoking fetch-parcel-geometry:', error);
    } else {
        console.log('✅ Edge function invoked! It will fetch them in the background.');
    }
    process.exit(0);
}

fetchGeometry();
