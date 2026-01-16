// Search for users with similar names
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function searchUsers() {
    try {
        // Get all users to find similar names
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, name, role')
            .order('name');

        console.log(`Total users: ${allUsers?.length || 0}\n`);

        // Look for Jirka or Poláček variants
        const jiris = allUsers?.filter(u =>
            u.name?.toLowerCase().includes('jir') ||
            u.name?.toLowerCase().includes('pol')
        );

        console.log('Users with "Jir" or "Pol" in name:');
        jiris?.forEach(u => {
            console.log(`  - ${u.name} (${u.role}) [ID: ${u.id}]`);
        });

        // Also show Lukáš
        console.log('\nUsers with "Lukáš":');
        const lukases = allUsers?.filter(u => u.name?.toLowerCase().includes('luk'));
        lukases?.forEach(u => {
            console.log(`  - ${u.name} (${u.role}) [ID: ${u.id}]`);
        });

        // Show masters
        console.log('\nAll Masters:');
        const masters = allUsers?.filter(u => u.role === 'Mistr');
        masters?.forEach(u => {
            console.log(`  - ${u.name} [ID: ${u.id}]`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

searchUsers();
