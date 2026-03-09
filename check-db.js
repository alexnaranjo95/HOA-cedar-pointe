import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-fk480wc88ckwg00wg0w8kk8o.167.88.43.166.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzAwOTYwMCwiZXhwIjo0OTI4NjgzMjAwLCJyb2xlIjoiYW5vbiJ9.AW4c5jce4__GD2RBLBvKQjD9oVkkxgl5C9ckUlNkkkI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('properties')
        .select('address, status');

    if (error) {
        console.error(error);
        return;
    }

    const target1 = data.find(p => p.address.includes('16253 SW 288'));
    const target2 = data.find(p => p.address.includes('16249 SW 290'));

    console.log("Total properties:", data.length);
    console.log("16253 SW 288:", target1);
    console.log("16249 SW 290:", target2);

    const missingFromList = ['16253 SW 288th Ter, Homestead, FL 33033', '16249 SW 290th Ter, Homestead, FL 33033'];
    const missingInDB = missingFromList.filter(addr => !data.some(p => p.address === addr));
    console.log("These are NOT in the database:", missingInDB);
}

check();
