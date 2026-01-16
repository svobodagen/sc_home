// Query Lukáš 15's certificates from Jirka Poláček
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LUKAS_ID = 'user_1765024523595_csuwbe05d';
const JIRKA_ID = 'user_1764453885832_z97cfu0fh';

async function checkCertificates() {
    try {
        console.log('Lukáš 15 ID:', LUKAS_ID);
        console.log('Jirka Poláček ID:', JIRKA_ID);
        console.log('\n=== CERTIFICATES TABLE ===\n');

        // Get all certificates for Lukáš
        const { data: allCerts } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', LUKAS_ID);

        console.log(`Total certificates for Lukáš 15: ${allCerts?.length || 0}`);

        // Active certificates (locked = false)
        const activeCerts = allCerts?.filter(c => !c.locked);
        console.log(`Active (unlocked) certificates: ${activeCerts?.length || 0}\n`);

        if (activeCerts && activeCerts.length > 0) {
            console.log('All active certificates:');
            activeCerts.forEach(cert => {
                const unlockedBy = cert.unlocked_by || cert.master_id;
                console.log(`  - ${cert.title}`);
                console.log(`    Category: ${cert.category}`);
                console.log(`    Unlocked by: ${unlockedBy}`);
                console.log(`    Earned at: ${cert.earned_at}`);
                console.log(`    Template ID: ${cert.template_id}`);
            });
        }

        // Filter by Jirka
        const jirkaCerts = activeCerts?.filter(cert =>
            String(cert.unlocked_by) === String(JIRKA_ID) ||
            String(cert.master_id) === String(JIRKA_ID)
        );

        console.log(`\n=== CERTIFICATES FROM JIRKA POLÁČEK ===`);
        console.log(`Count: ${jirkaCerts?.length || 0}\n`);

        if (jirkaCerts && jirkaCerts.length > 0) {
            jirkaCerts.forEach(cert => {
                console.log(`✓ ${cert.title} (${cert.category})`);
                console.log(`  Earned: ${cert.earned_at || 'N/A'}`);
                console.log(`  Template ID: ${cert.template_id}`);
                console.log();
            });
        } else {
            console.log('❌ No active certificates from Jirka Poláček found\n');
        }

        // Check certificate_unlock_history
        console.log('=== UNLOCK HISTORY ===\n');
        const { data: history } = await supabase
            .from('certificate_unlock_history')
            .select('*')
            .eq('user_id', LUKAS_ID);

        console.log(`Total history records for Lukáš: ${history?.length || 0}`);

        const jirkaHistory = history?.filter(h => String(h.unlocked_by) === String(JIRKA_ID));
        console.log(`History records from Jirka: ${jirkaHistory?.length || 0}\n`);

        if (jirkaHistory && jirkaHistory.length > 0) {
            jirkaHistory.forEach(h => {
                console.log(`  Template ID: ${h.template_id}, Unlocked at: ${h.unlocked_at}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkCertificates();
