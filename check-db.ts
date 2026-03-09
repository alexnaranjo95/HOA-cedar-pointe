import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io',
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI'
);

async function check() {
    const { data, error } = await supabase
        .from('properties')
        .select('address, status')
        .ilike('address', '%290%Ter%');

    if (error) console.error(error);
    console.log(`Found ${data?.length} properties on 290th Ter`);
    console.log(data?.map(p => p.address).sort());

    const { data: missingData, error: mError } = await supabase
        .from('properties')
        .select('address, status')
        .in('address', ['16253 SW 288th Ter, Homestead, FL 33033', '16249 SW 290th Ter, Homestead, FL 33033']);

    console.log("Specific addresses:", missingData);
}

check();
