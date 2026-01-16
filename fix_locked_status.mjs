// Fix locked status for certificates that should be unlocked
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LUKAS_ID = 'user_1765024523595_csuwbe05d';
const JIRKA_ID = 'user_1764453885832_z97cfu0fh';

async function fixLockedStatus() {
    try {
        console.log('=== FIXING LOCKED STATUS ===\n');

        // Get unlock history for Lukáš from Jirka
        const { data: history } = await supabase
            .from('certificate_unlock_history')
            .select('*')
            .eq('user_id', LUKAS_ID)
            .eq('unlocked_by', JIRKA_ID);

        console.log(`History records from Jirka for Lukáš: ${history?.length || 0}\n`);

        if (!history || history.length === 0) {
            console.log('No history found!');
            return;
        }

        // For each history record, unlock the corresponding certificate
        for (const h of history) {
            console.log(`Processing Template ID ${h.template_id}...`);

            // Find certificate
            const { data: certs } = await supabase
                .from('certificates')
                .select('*')
                .eq('user_id', LUKAS_ID)
                .eq('template_id', h.template_id);

            console.log(`  Found ${certs?.length || 0} cert(s)`);

            if (certs && certs.length > 0) {
                for (const cert of certs) {
                    console.log(`  Cert ID ${cert.id}: locked=${cert.locked}, master_id=${cert.master_id}`);

                    // Update to unlocked for Jirka's cert
                    const { error } = await supabase
                        .from('certificates')
                        .update({
                            locked: false,
                            earned_at: h.unlocked_at || new Date().toISOString()
                        })
                        .eq('id', cert.id);

                    if (error) {
                        console.error(`  ❌ Error:`, error);
                    } else {
                        console.log(`  ✅ Updated to UNLOCKED`);
                    }
                }
            }
        }

        console.log('\n✅ Done!');

    } catch (error) {
        console.error('Error:', error);
    }
}

fixLockedStatus();
