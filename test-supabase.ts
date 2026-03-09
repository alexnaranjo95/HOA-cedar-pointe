import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Connecting to Supabase...');
    const { data, error } = await supabase.from('properties').select('id').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

test();
