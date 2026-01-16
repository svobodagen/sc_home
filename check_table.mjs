// Check certificates table structure
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTableStructure() {
    try {
        // Get one certificate to see its structure
        const { data: certs } = await supabase
            .from('certificates')
            .select('*')
            .limit(1);

        if (certs && certs.length > 0) {
            console.log('Certificate columns:', Object.keys(certs[0]));
            console.log('\nSample certificate:');
            console.log(JSON.stringify(certs[0], null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkTableStructure();
