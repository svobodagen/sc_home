const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or keys in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStarter() {
    console.log("🔍 Debugging 'Starter' certificate rules...");

    // 1. Get Template
    const { data: templates, error: tErr } = await supabase
        .from("certificate_templates")
        .select("*")
        .ilike("title", "%Start%");
    // Using ilike for case-insensitive partial match to find "Survivor", "Starter", "Startovní", "Začátečník" etc.

    if (tErr) {
        console.error("Error fetching templates:", tErr);
        return;
    }

    if (!templates || templates.length === 0) {
        console.log("❌ No certificate template found matching '%Start%'");
        // Try listing all to see what's there
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
