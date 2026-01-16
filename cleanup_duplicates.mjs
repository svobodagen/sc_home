// Clean up duplicate certificates
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupDuplicates(dryRun = true) {
    try {
        console.log(dryRun ? '=== DRY RUN MODE ===' : '=== EXECUTING CLEANUP ===');
        console.log('');

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

        // Find duplicates (groups with more than 1 cert)
        const duplicateGroups = Object.entries(groups).filter(([key, certs]) => certs.length > 1);

        console.log(`Found ${duplicateGroups.length} groups with duplicates\n`);

        let totalToDelete = 0;
        const idsToDelete = [];

        duplicateGroups.forEach(([key, certs]) => {
            const [userId, templateId, unlockedBy] = key.split('__');
            const count = certs.length;

            // Keep the first one (lowest ID), delete the rest
            const toKeep = certs[0];
            const toDelete = certs.slice(1);

            console.log(`Group: User ${userId.slice(-8)}, Template ${templateId}, UnlockedBy ${unlockedBy.slice(-8)}`);
            console.log(`  Total: ${count} certs | Keeping ID: ${toKeep.id} | Deleting: ${toDelete.length} certs`);
            console.log(`  Title: ${toKeep.title}`);
            console.log(`  IDs to delete: ${toDelete.map(c => c.id).join(', ')}`);
            console.log('');

            totalToDelete += toDelete.length;
            idsToDelete.push(...toDelete.map(c => c.id));
        });

        console.log(`\n=== SUMMARY ===`);
        console.log(`Total certificates: ${allCerts.length}`);
        console.log(`Certificates to DELETE: ${totalToDelete}`);
        console.log(`Certificates to KEEP: ${allCerts.length - totalToDelete}`);

        if (!dryRun && idsToDelete.length > 0) {
            console.log('\n⚠️  DELETING NOW...');

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
        } else if (dryRun) {
            console.log('\n💡 This was a DRY RUN. Run with dryRun=false to actually delete.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// First run in dry-run mode
cleanupDuplicates(true);
