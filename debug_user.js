const { createClient } = require("@supabase/supabase-js");

// Credentials from services/api.ts fallback
const supabaseUrl = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUser() {
    console.log("🔍 Debugging User Data...");

    // 1. Find User
    const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, name, email")
        .ilike("name", "%Lukáš%");

    if (uErr) {
        console.error("Error fetching users:", uErr);
        return;
    }

    if (!users || users.length === 0) {
        console.log("❌ No user found matching 'Lukáš'");
        return;
    }

    console.log(`Found ${users.length} users:`);

    for (const user of users) {
        console.log(`\n👤 User: ${user.name} (${user.email}) - ID: ${user.id}`);

        // 2. Get Work Hours
        const { data: hours, error: hErr } = await supabase
            .from("work_hours")
            .select("*")
            .eq("user_id", user.id);

        if (hErr) {
            console.error("   ❌ Error fetching hours:", hErr);
            continue;
        }

        console.log(`   ⏱ Total entries: ${hours.length}`);

        let sumTotal = 0;
        let sumWork = 0;

        hours.forEach((h, i) => {
            const isWork = h.description && h.description.includes("Práce");
            const val = h.hours;
            const type = typeof val;

            console.log(`      ${i + 1}. ${val} hours (${type}) - Desc: "${h.description}" - IsWork: ${isWork}`);

            // Mimic the reducing logic
            sumTotal = sumTotal + (val || 0);
            if (isWork) {
                sumWork = sumWork + (val || 0);
            }
        });

        console.log(`   🧮 Calculated Sum Total: ${sumTotal} (Type: ${typeof sumTotal})`);
        console.log(`   🧮 Calculated Sum Work:  ${sumWork} (Type: ${typeof sumWork})`);
    }
}

debugUser();
