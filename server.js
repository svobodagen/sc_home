const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// DEBUG: Log environment variables at startup
console.log("📋 ===== SERVER STARTUP DEBUG =====");
console.log("📌 PORT:", process.env.PORT || 3000);
console.log("📌 NODE_ENV:", process.env.NODE_ENV || "development");
console.log("📌 SUPABASE_URL:", process.env.SUPABASE_URL?.slice(0, 30) + "...");
console.log("📌 SUPABASE_SERVICE_KEY present:", !!process.env.SUPABASE_SERVICE_KEY);
console.log("📌 SUPABASE_ANON_KEY present:", !!process.env.SUPABASE_ANON_KEY);

const app = express();

// CORS - umožnit cross-origin requests z HTTPS
const corsOptions = {
  origin: "*",
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Supabase client - use SERVICE_KEY for admin access
console.log("🔧 Initializing Supabase client...");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);
console.log("✅ Supabase client initialized");

// ============ INIT DB ============
async function initDB() {
  try {
    // Check if tables exist by querying users table
    const { data, error } = await supabase.from("users").select("count()", { count: "exact" });
    
    if (error && error.message.includes("does not exist")) {
      console.log("⚠ Tables don't exist. Please create them in Supabase:");
      console.log("1. Go to SQL Editor in Supabase dashboard");
      console.log("2. Run the SQL from: migrations/001_init_schema.sql");
      return;
    }
    
    console.log("✓ Supabase tables ready");
  } catch (error) {
    console.log("✓ Supabase connection ready (tables may need creation)");
  }
}

// ============ AUTH ============
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .single();
    
    if (error || !data) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data, error } = await supabase
      .from("users")
      .insert([{ id, email, password, name, role, timestamp: Date.now() }])
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Create user_data record
    await supabase
      .from("user_data")
      .insert([{
        user_id: id,
        projects: JSON.stringify([]),
        work_hours: JSON.stringify([]),
        certificates: JSON.stringify([]),
        weekly_goal_work: 40,
        weekly_goal_study: 10,
        master_craft: ""
      }]);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role");
    
    if (error) throw new Error(error.message);
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USER DATA ============
app.get("/api/user/:userId/data", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("user_data")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) {
      return res.json({
        projects: [],
        work_hours: [],
        certificates: [],
        weekly_goal_work: 40,
        weekly_goal_study: 10,
        master_craft: ""
      });
    }
    
    res.json({
      projects: data.projects ? JSON.parse(data.projects) : [],
      work_hours: data.work_hours ? JSON.parse(data.work_hours) : [],
      certificates: data.certificates ? JSON.parse(data.certificates) : [],
      weekly_goal_work: data.weekly_goal_work || 40,
      weekly_goal_study: data.weekly_goal_study || 10,
      master_craft: data.master_craft || ""
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user/:userId/data", async (req, res) => {
  try {
    const { userId } = req.params;
    const { projects, workHours, certificates, weeklyGoal, selectedMaster } = req.body;
    
    const { error } = await supabase
      .from("user_data")
      .upsert({
        user_id: userId,
        projects: JSON.stringify(projects || []),
        work_hours: JSON.stringify(workHours || []),
        certificates: JSON.stringify(certificates || []),
        weekly_goal_work: weeklyGoal?.work || 40,
        weekly_goal_study: weeklyGoal?.study || 10,
        master_craft: selectedMaster || ""
      }, { onConflict: "user_id" });
    
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MASTER-APPRENTICE ============
app.get("/api/master/:masterId/apprentices", async (req, res) => {
  try {
    const { masterId } = req.params;
    const { data, error } = await supabase
      .from("master_apprentices")
      .select("*")
      .eq("master_id", masterId);
    
    if (error) throw new Error(error.message);
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/master/:masterId/apprentices/:apprenticeId", async (req, res) => {
  try {
    const { masterId, apprenticeId } = req.params;
    const { apprenticeName } = req.body;
    
    const { error } = await supabase
      .from("master_apprentices")
      .insert([{ master_id: masterId, apprentice_id: apprenticeId, apprentice_name: apprenticeName }]);
    
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/master/:masterId/apprentices/:apprenticeId", async (req, res) => {
  try {
    const { masterId, apprenticeId } = req.params;
    const { error } = await supabase
      .from("master_apprentices")
      .delete()
      .eq("master_id", masterId)
      .eq("apprentice_id", apprenticeId);
    
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HEALTH CHECK ============
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.status(200).json({ 
    service: "svobodne-cechy-backend",
    status: "running",
    version: "1.0.0",
    supabase: process.env.SUPABASE_URL ? "connected" : "not-configured"
  });
});

// ============ TEST SQL ============
app.post("/api/test/save", async (req, res) => {
  try {
    const { userId, testValue } = req.body;
    
    // Delete old data for this user first
    await supabase.from("test_data").delete().eq("user_id", userId);
    
    // Insert new data
    const { error } = await supabase
      .from("test_data")
      .insert([{ user_id: userId, test_value: testValue }]);
    
    if (error) throw new Error(error.message);
    res.json({ success: true, message: "✓ Saved to Supabase" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/test/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("test_data")
      .select("test_value")
      .eq("user_id", userId)
      .single();
    
    if (error) return res.json({ test_value: null, message: "No data found" });
    res.json({ ...data, message: "✓ Read from Supabase" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN ============
app.delete("/api/admin/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/reset", async (req, res) => {
  try {
    const { userId } = req.body;
    const { error } = await supabase
      .from("user_data")
      .update({
        projects: JSON.stringify([]),
        work_hours: JSON.stringify([]),
        certificates: JSON.stringify([])
      })
      .eq("user_id", userId);
    
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.message, "\nStack:", err.stack);
  res.status(err.status || 500).json({ 
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    timestamp: new Date().toISOString()
  });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ============ START ============
const PORT = process.env.PORT || 3000;
console.log("⏳ Starting database initialization...");
initDB().then(() => {
  console.log("✅ Database initialized");
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 ===== SERVER STARTED =====`);
    console.log(`✅ Server running on 0.0.0.0:${PORT}`);
    console.log(`✅ Supabase: ${process.env.SUPABASE_URL}`);
    console.log(`✅ Health check: GET /health`);
    console.log(`✅ Root: GET /`);
    console.log(`✅ Endpoints ready for requests`);
    console.log(`=============================\n`);
  });
  
  server.on('error', (err) => {
    console.error('❌ SERVER ERROR:', err);
    process.exit(1);
  });
  
  process.on('SIGTERM', () => {
    console.log('📭 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}).catch(err => {
  console.error("❌ Failed to initialize:", err);
  process.exit(1);
});
