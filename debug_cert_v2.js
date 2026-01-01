const { createClient } = require("@supabase/supabase-js");

// Credentials from services/api.ts fallback
const supabaseUrl = "https://imivlsfkgmqkhqhhiilf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStarter() {
    console.log("🔍 Debugging 'Starter' certificate rules (using frontend DB)...");

    // 1. Get Template
    const { data: templates, error: tErr } = await supabase
        .from("certificate_templates")
        .select("*")
        .ilike("title", "%Start%");

    if (tErr) {
        console.error("Error fetching templates:", tErr);
        return;
    }

    if (!templates || templates.length === 0) {
        console.log("❌ No certificate template found matching '%Start%'");
        // List all just in case
        const { data: all } = await supabase.from("certificate_templates").select("id, title");
        console.log("Available certs:", all);
        return;
    }

    console.log(`Found ${templates.length} templates matching '%Start%':`);

    for (const t of templates) {
        console.log(`\n-------------------------------------------`);
        console.log(`📜 Template: "${t.title}" (ID: ${t.id})`);
        console.log(`   Category: ${t.category}, Points: ${t.points}`);

        // 2. Get Rules
        const { data: rules, error: rErr } = await supabase
            .from("certificate_unlock_rules")
            .select("*")
            .eq("template_id", t.id);

        if (rErr) {
            console.error("   ❌ Error fetching rules:", rErr);
            continue;
        }

        console.log(`   ⚙️ Rules (${rules.length}):`);
        if (rules.length === 0) {
            console.log("      ⚠️  NO RULES FOUND (In current logic this means LOCKED)");
        }

        rules.forEach((r, i) => {
            console.log(`      ${i + 1}. Type: ${r.rule_type}`);
            console.log(`         Condition: ${r.condition_type}`);
            console.log(`         Value: ${r.condition_value}`);
            console.log(`         Desc: ${r.description}`);
        });
    }
}

debugStarter();
