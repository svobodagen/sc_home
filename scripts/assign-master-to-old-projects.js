/**
 * Script to assign master_id to old projects that don't have one
 * 
 * This script:
 * 1. Finds all projects without master_id
 * 2. For each project, finds the user (apprentice)
 * 3. Finds the first master connected to that apprentice
 * 4. Assigns that master_id to the project
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignMasterToOldProjects() {
    console.log('🔍 Finding projects without master_id...\n');

    try {
        // 1. Get all projects without master_id
        const { data: projectsWithoutMaster, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .is('master_id', null);

        if (projectsError) {
            console.error('❌ Error fetching projects:', projectsError);
            return;
        }

        if (!projectsWithoutMaster || projectsWithoutMaster.length === 0) {
            console.log('✅ No projects without master_id found. All projects are already assigned!');
            return;
        }

        console.log(`📋 Found ${projectsWithoutMaster.length} projects without master_id\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        // 2. For each project, find the apprentice's master
        for (const project of projectsWithoutMaster) {
            const userId = project.user_id;

            // Find the first master connected to this apprentice
            const { data: connections, error: connError } = await supabase
                .from('master_apprentices')
                .select('master_id')
                .eq('apprentice_id', userId)
                .limit(1);

            if (connError) {
                console.error(`❌ Error finding master for user ${userId}:`, connError);
                skippedCount++;
                continue;
            }

            if (!connections || connections.length === 0) {
                console.log(`⚠️  No master found for project "${project.title}" (user: ${userId})`);
                skippedCount++;
                continue;
            }

            const masterId = connections[0].master_id;

            // 3. Update the project with master_id
            const { error: updateError } = await supabase
                .from('projects')
                .update({ master_id: masterId })
                .eq('id', project.id);

            if (updateError) {
                console.error(`❌ Error updating project ${project.id}:`, updateError);
                skippedCount++;
                continue;
            }

            console.log(`✅ Assigned master ${masterId} to project "${project.title}" (ID: ${project.id})`);
            updatedCount++;
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Successfully updated ${updatedCount} projects`);
        console.log(`⚠️  Skipped ${skippedCount} projects (no master found or error)`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the script
assignMasterToOldProjects()
    .then(() => {
        console.log('\n✨ Script completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
