// Clean duplicates better - keep the one with correct master
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function smartCleanup() {
    try {
        console.log('=== SMART DUPLICATE CLEANUP ===\n');

        const { data: allCerts } = await supabase
            .from('certificates')
            .select('*')
            .order('id');

        console.log(`Total certificates: ${allCerts?.length || 0}\n`);

        // Group by user_id + template_id
        const groups = {};
        allCerts?.forEach(cert => {
            const key = `${cert.user_id}__${cert.template_id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(cert);
        });

        const duplicates = Object.entries(groups).filter(([k, certs]) => certs.length > 1);
        console.log(`Groups with duplicates: ${duplicates.length}\n`);

        const toDelete = [];

        duplicates.forEach(([key, certs]) => {
            console.log(`Group: ${key} (${certs.length} certs)`);

            // Prefer: unlocked > locked, then lowest ID
            certs.sort((a, b) => {
                if (a.locked !== b.locked) return a.locked ? 1 : -1; // unlocked first
                return a.id - b.id; // then by ID
            });

            const keep = certs[0];
            const remove = certs.slice(1);

            console.log(`  KEEP: ID ${keep.id} (locked=${keep.locked}, master=${keep.master_id?.slice(-8)})`);
            remove.forEach(c => {
                console.log(`  DELETE: ID ${c.id} (locked=${c.locked}, master=${c.master_id?.slice(-8)})`);
                toDelete.push(c.id);
            });
            console.log();
        });

        console.log(`\nTotal to delete: ${toDelete.length}`);

        if (toDelete.length > 0) {
            console.log('\n⚠️  DELETING...');

            for (let i = 0; i < toDelete.length; i += 100) {
                const batch = toDelete.slice(i, i + 100);
                const { error } = await supabase
                    .from('certificates')
                    .delete()
                    .in('id', batch);

                if (error) {
                    console.error(`Error:`, error);
                } else {
                    console.log(`✓ Deleted ${batch.length} records`);
                }
            }
        }

        const { data: final } = await supabase
            .from('certificates')
            .select('id', { count: 'exact' });

        console.log(`\n✅ Remaining: ${final?.length || 0} certificates`);

    } catch (error) {
        console.error('Error:', error);
    }
}

smartCleanup();
