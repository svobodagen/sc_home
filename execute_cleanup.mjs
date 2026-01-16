// Clean up duplicate certificates - EXECUTE
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupDuplicates() {
    try {
        console.log('=== EXECUTING CLEANUP ===\n');

        // Get ALL certificates
        const { data: allCerts, error } = await supabase
            .from('certificates')
            .select('*')
            .order('id');

        if (error) throw error;

        console.log(`Total certificates in DB: ${allCerts.length}\n`);

        // Group by user_id + template_id + unlocked_by
        const groups = {};

        allCerts.forEach(cert => {
            const key = `${cert.user_id}__${cert.template_id}__${cert.unlocked_by || 'null'}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(cert);
        });

        // Find duplicates
        const duplicateGroups = Object.entries(groups).filter(([key, certs]) => certs.length > 1);

        const idsToDelete = [];
        duplicateGroups.forEach(([key, certs]) => {
            // Keep the first one (lowest ID), delete the rest
            const toDelete = certs.slice(1);
            idsToDelete.push(...toDelete.map(c => c.id));
        });

        console.log(`Certificates to DELETE: ${idsToDelete.length}\n`);

        if (idsToDelete.length > 0) {
            console.log('⚠️  DELETING...');

            // Delete in batches of 100
            for (let i = 0; i < idsToDelete.length; i += 100) {
                const batch = idsToDelete.slice(i, i + 100);
                const { error: deleteError } = await supabase
                    .from('certificates')
                    .delete()
                    .in('id', batch);

                if (deleteError) {
                    console.error(`Error deleting batch ${i / 100 + 1}:`, deleteError);
                } else {
                    console.log(`✓ Deleted batch ${i / 100 + 1} (${batch.length} records)`);
                }
            }

            console.log('\n✅ Cleanup complete!');

            // Verify
            const { data: remaining } = await supabase
                .from('certificates')
                .select('id', { count: 'exact' });

            console.log(`\nRemaining certificates: ${remaining?.length || 0}`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

cleanupDuplicates();
