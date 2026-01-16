// Delete all certificates for Lukáš and let them recreate properly
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LUKAS_ID = 'user_1765024523595_csuwbe05d';

async function resetCertificates() {
    try {
        console.log('=== RESETTING CERTIFICATES FOR LUKÁŠ ===\n');

        // Delete ALL certificates for Lukáš
        const { error } = await supabase
            .from('certificates')
            .delete()
            .eq('user_id', LUKAS_ID);

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('✅ Deleted all certificates for Lukáš');
            console.log('\nThey will be recreated automatically when you open the app.');
            console.log('The unlock history is preserved, so manual certs will be restored.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

resetCertificates();
