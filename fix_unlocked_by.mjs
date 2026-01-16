// Fix unlocked_by field using certificate_unlock_history
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixUnlockedBy() {
    try {
        console.log('=== FIXING unlocked_by FIELD ===\n');

        // Get all active certificates
        const { data: certs } = await supabase
            .from('certificates')
            .select('*')
            .eq('locked', false);

        console.log(`Active certificates: ${certs?.length || 0}\n`);

        // Get all unlock history
        const { data: history } = await supabase
            .from('certificate_unlock_history')
            .select('*');

        console.log(`History records: ${history?.length || 0}\n`);

        let updated = 0;
        let notFound = 0;

        for (const cert of certs || []) {
            if (cert.unlocked_by) {
                console.log(`✓ Cert ${cert.id} already has unlocked_by: ${cert.unlocked_by}`);
                continue;
            }

            // Find in history
            const historyRecord = history?.find(h =>
                h.user_id === cert.user_id &&
                h.template_id === cert.template_id
            );

            if (historyRecord && historyRecord.unlocked_by) {
                console.log(`📝 Updating cert ${cert.id} (${cert.title}) - setting unlocked_by to ${historyRecord.unlocked_by}`);

                const { error } = await supabase
                    .from('certificates')
                    .update({ unlocked_by: historyRecord.unlocked_by })
                    .eq('id', cert.id);

                if (error) {
                    console.error(`  ❌ Error:`, error);
                } else {
                    updated++;
                }
            } else {
                console.log(`⚠️  No history found for cert ${cert.id} (${cert.title})`);
                notFound++;
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Updated: ${updated}`);
        console.log(`Not found in history: ${notFound}`);
        console.log(`Already had unlocked_by: ${(certs?.length || 0) - updated - notFound}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

fixUnlockedBy();
