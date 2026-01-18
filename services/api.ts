// API - Supabase Cloud First (bez backendu!)
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://imivlsfkgmqkhqhhiilf.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaXZsc2ZrZ21xa2hxaGhpaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MzEsImV4cCI6MjA3OTkyMjczMX0.KR4RHoQ4UlK2Sg7GB9LxdkaewPbDC86S7gIj8Inf0MA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const api = {
  // Auth - Přihlášení
  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

      if (error) throw new Error("Nesprávné přihlašovací údaje");
      if (!data) throw new Error("Uživatel nenalezen");

      return data;
    } catch (err: any) {
      throw new Error(err.message || "Přihlášení selhalo");
    }
  },

  // Auth - Registrace
  async register(email: string, password: string, name: string, role: string) {
    try {
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from("users")
        .insert([{
          id,
          email,
          password,
          name,
          role: role || "Učedník",
          timestamp: Date.now()
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Automaticky vytvoř certifikáty pro nového uživatele
      await this.initializeCertificatesForUser(id);

      return data;
    } catch (err: any) {
      throw new Error(err.message || "Registrace selhala");
    }
  },

  // Auth - Inicializace certifikátů pro nového uživatele
  async initializeCertificatesForUser(userId: string) {
    try {
      // Stáhni všechny šablony certifikátů
      const { data: templates, error: templErr } = await supabase
        .from("certificate_templates")
        .select("*");

      if (templErr || !templates || templates.length === 0) return;

      // Pro každou šablonu vytvoř certificate s locked: true
      const certificatesToInsert = templates.map((t: any) => ({
        user_id: userId,
        template_id: t.id,
        title: t.title,
        item_type: t.item_type || (t.category === 'Badge' ? 'BADGE' : 'CERTIFICATE'),
        scope: t.scope || 'GLOBAL',
        points: t.points || 0,
        requirement: t.category === "Badge" ? "Automaticky dle pravidel" : "Aktivuje mistr",
        locked: true,
        earned_at: null
      }));

      const { error: insertErr } = await supabase
        .from("certificates")
        .insert(certificatesToInsert);

      if (insertErr) {
        console.error("❌ Chyba při vytváření certifikátů:", insertErr);
      } else {
        console.log(`✅ Vytvořeno ${certificatesToInsert.length} certifikátů pro uživatele ${userId}`);
      }
    } catch (err: any) {
      console.error("❌ Chyba při inicializaci certifikátů:", err);
    }
  },

  // Admin - Všichni uživatelé
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*");

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      console.error("Error fetching users:", err);
      return [];
    }
  },

  // User Data - Stažení
  async getUserData(userId: string) {
    try {
      const { data, error } = await supabase
        .from("user_data")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || { projects: [], hours: [], badges: [] };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení dat");
    }
  },

  // User Data - Uložení
  async saveUserData(userId: string, data: any) {
    try {
      const { data: result, error } = await supabase
        .from("user_data")
        .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při ukládání dat");
    }
  },

  // Master - Učedníci
  async getApprentices(masterId: string) {
    try {
      const { data, error } = await supabase
        .from("master_apprentices")
        .select("*")
        .eq("master_id", masterId);

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení učedníků");
    }
  },

  // Master - Přidat učedníka
  async addApprentice(masterId: string, apprenticeId: string, apprenticeName: string) {
    try {
      const { data, error } = await supabase
        .from("master_apprentices")
        .insert([{
          master_id: masterId,
          apprentice_id: apprenticeId,
          apprentice_name: apprenticeName,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw new Error(error.message);
      }
      console.log("✅ Učedník přidán:", data);
      return data;
    } catch (err: any) {
      console.error("❌ addApprentice error:", err);
      throw new Error(err.message || "Chyba při přidávání učedníka");
    }
  },

  // Master - Odebrat učedníka
  async removeApprentice(masterId: string, apprenticeId: string) {
    try {
      const { error } = await supabase
        .from("master_apprentices")
        .delete()
        .eq("master_id", masterId)
        .eq("apprentice_id", apprenticeId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při odebírání učedníka");
    }
  },

  // Host - Hledání mistrů učedníka
  async getMastersForApprentice(apprenticeId: string) {
    try {
      const { data, error } = await supabase
        .from("master_apprentices")
        .select("master_id")
        .eq("apprentice_id", apprenticeId);

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      console.error("Chyba při hledání mistra učedníka:", err);
      return [];
    }
  },

  // Host - Všechna propojení
  async getAllMasterApprenticeConnections() {
    try {
      const { data, error } = await supabase
        .from("master_apprentices")
        .select("*");

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      console.error("Chyba při stahování propojení:", err);
      return [];
    }
  },

  // Admin - Smazat uživatele
  async deleteUser(userId: string) {
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při mazání uživatele");
    }
  },

  // ============ GOALS ============
  async getApprenticeGoals(userId: string) {
    try {
      const { data, error } = await supabase
        .from("apprentice_goals")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 is 'not found'
      return data || null;
    } catch (err: any) {
      console.warn("Chyba při stahování cílů:", err.message);
      return null;
    }
  },

  async saveApprenticeGoals(userId: string, goals: any) {
    try {
      const { data, error } = await supabase
        .from("apprentice_goals")
        .upsert({
          user_id: userId,
          ...goals,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při ukládání cílů");
    }
  },

  // Admin - Reset dat (vymaž hodiny, projekty, cíle a resetuj limity na admin defaults)
  async resetUserData(userId: string) {
    try {
      // Zjisti počet hodin před smazáním
      const { data: hoursData, error: hoursCountError } = await supabase
        .from("work_hours")
        .select("id")
        .eq("user_id", userId);

      const hoursCount = hoursData?.length || 0;

      // Zjisti počet projektů před smazáním
      const { data: projectsData, error: projectsCountError } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", userId);

      const projectsCount = projectsData?.length || 0;

      // Vymaž pracovní hodiny
      const { error: hoursError } = await supabase
        .from("work_hours")
        .delete()
        .eq("user_id", userId);

      if (hoursError) throw new Error(hoursError.message);

      // Vymaž projekty
      const { error: projectsError } = await supabase
        .from("projects")
        .delete()
        .eq("user_id", userId);

      if (projectsError) throw new Error(projectsError.message);

      // Vymaž cíle učedníka
      try {
        await supabase
          .from("apprentice_goals")
          .delete()
          .eq("user_id", userId);
      } catch (goalErr) {
        console.log("Nepodařilo se smazat cíle učedníka (tabulka možná neexistuje)");
      }

      // Resetuj limity hodin na admin defaults
      try {
        const adminDefaults = await this.getAdminSettings();

        // Smaž existující limity
        await supabase
          .from("user_hour_limits")
          .delete()
          .eq("user_id", userId);

        // Vytvoř nové limity z admin defaults
        await supabase
          .from("user_hour_limits")
          .insert({
            user_id: userId,
            max_work_hours_day: adminDefaults.max_work_hours_day,
            max_study_hours_day: adminDefaults.max_study_hours_day,
            max_work_hours_week: adminDefaults.max_work_hours_week,
            max_study_hours_week: adminDefaults.max_study_hours_week,
            max_work_hours_month: adminDefaults.max_work_hours_month,
            max_study_hours_month: adminDefaults.max_study_hours_month,
            max_work_hours_year: adminDefaults.max_work_hours_year,
            max_study_hours_year: adminDefaults.max_study_hours_year
          });
      } catch (limitsErr) {
        console.log("Nepodařilo se resetovat limity hodin");
      }

      return { success: true, hoursCount, projectsCount };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při resetování dat");
    }
  },

  // Test - Uložit test hodnotu
  async saveTestValue(userId: string, testValue: string) {
    try {
      const { data, error } = await supabase
        .from("test_data")
        .upsert({
          user_id: userId,
          test_value: testValue,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při ukládání test dat");
    }
  },

  // Test - Stažení test hodnoty
  async getTestValue(userId: string) {
    try {
      const { data, error } = await supabase
        .from("test_data")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || { test_value: null };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení test dat");
    }
  },

  // ============ PROJECTS ============
  async getProjects(userId: string) {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení projektů");
    }
  },

  // Master - Projekty pod mistrem
  async getProjectsForMaster(masterId: string) {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("master_id", masterId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení projektů pro mistra");
    }
  },

  // Master - Hodiny pro seznam projektů
  async getWorkHoursForProjects(projectIds: any[]) {
    if (!projectIds || projectIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from("work_hours")
        .select("*")
        .in("project_id", projectIds);

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení hodin");
    }
  },

  // Master - Seznam učedníků
  async getApprenticesForMaster(masterId: string) {
    try {
      const { data: conns, error: connError } = await supabase
        .from("master_apprentices")
        .select("apprentice_id")
        .eq("master_id", masterId);

      if (connError) throw connError;
      if (!conns || conns.length === 0) return [];

      const appIds = conns.map((c: any) => c.apprentice_id);

      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", appIds);

      if (userError) throw userError;

      return users.map((u: any) => ({
        apprenticeId: u.id,
        apprenticeName: u.name,
        email: u.email
      }));
    } catch (err: any) {
      console.error("Error fetching apprentices:", err);
      return [];
    }
  },

  // Master - Certifikáty pro seznam učedníků
  async getCertificatesForApprentices(apprenticeIds: string[]) {
    if (!apprenticeIds || apprenticeIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .in("user_id", apprenticeIds);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error("Error fetching certs:", err);
      return [];
    }
  },

  // Host - Stažení všech projektů
  async getAllProjects() {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení všech projektů");
    }
  },

  // Projekty - Vytvoření
  async createProject(userId: string, title: string, description: string, category: string, image: string, masterId?: string | null) {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([{ user_id: userId, title, description, category, image, master_id: masterId || null }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při vytváření projektu");
    }
  },

  // Projekty - Aktualizace
  async updateProject(projectId: number, updates: any) {
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci projektu");
    }
  },

  // Projekty - Smazání
  async deleteProject(projectId: number) {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při mazání projektu");
    }
  },

  // Projekty - Toggle Like
  async toggleProjectLike(projectId: number, isLiked: boolean) {
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ is_liked: isLiked, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci lajku");
    }
  },

  // ============ WORK HOURS ============
  // Pracovní hodiny - Stažení
  async getWorkHours(userId: string) {
    try {
      const { data, error } = await supabase
        .from("work_hours")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map((hour: any) => ({
        ...hour,
        timestamp: hour.created_at ? new Date(hour.created_at).getTime() : Date.now()
      }));
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení pracovních hodin");
    }
  },

  // Pracovní hodiny - Přidání
  async addWorkHours(userId: string, projectId: number | null, hours: number, description: string, timestamp?: number, masterId?: string | null) {
    try {
      const createdAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
      const { data, error } = await supabase
        .from("work_hours")
        .insert([{ user_id: userId, project_id: projectId, hours, description, created_at: createdAt, master_id: masterId || null }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        ...data,
        timestamp: data.created_at ? new Date(data.created_at).getTime() : Date.now()
      };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při přidávání hodin");
    }
  },

  // Pracovní hodiny - Aktualizace
  async updateWorkHours(hoursId: number, updates: any) {
    try {
      // Převeď timestamp na created_at pokud je v updates
      const updateData: any = {};
      if (updates.hours !== undefined) updateData.hours = updates.hours;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.timestamp !== undefined) {
        updateData.created_at = new Date(updates.timestamp).toISOString();
      }
      if (updates.master_comment !== undefined) updateData.master_comment = updates.master_comment;

      const { data, error } = await supabase
        .from("work_hours")
        .update(updateData)
        .eq("id", hoursId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        ...data,
        timestamp: data.created_at ? new Date(data.created_at).getTime() : Date.now()
      };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci hodin");
    }
  },

  // Pracovní hodiny - Aktualizace komentáře mistra
  async updateWorkHourComment(id: number, masterComment: string) {
    try {
      const { data, error } = await supabase
        .from("work_hours")
        .update({ master_comment: masterComment })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci komentáře");
    }
  },

  // Pracovní hodiny - Smazání
  async deleteWorkHours(hoursId: number) {
    try {
      const { error } = await supabase
        .from("work_hours")
        .delete()
        .eq("id", hoursId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při mazání hodin");
    }
  },

  // ============ CERTIFICATES ============
  // Certifikáty - Stažení (vrácení SKUTEČNÝCH certifikátů z tabulky certificates)
  async getCertificates(userId: string) {
    try {
      // 1. Načti šablony
      const { data: templates } = await supabase.from("certificate_templates").select("*");
      if (!templates) return [];

      // 2. Načti stávající certifikáty uživatele
      const { data: certificates } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId);

      // 3. Načti mistry uživatele (pro PER_MASTER scope)
      const { data: masters } = await supabase
        .from("master_apprentices")
        .select("master_id")
        .eq("apprentice_id", userId);

      const masterIds = (masters || []).map(m => m.master_id);
      const toInsert: any[] = [];

      for (const t of templates) {
        const itemType = t.item_type || (t.category === 'Badge' ? 'BADGE' : 'CERTIFICATE');
        const scope = t.scope || 'GLOBAL';

        if (scope === 'GLOBAL') {
          // Zkontroluj, zda existuje jakýkoliv záznam pro tuto šablonu
          const exists = certificates?.some(c => c.template_id === t.id);
          if (!exists) {
            toInsert.push({
              user_id: userId,
              template_id: t.id,
              master_id: null,
              title: t.title,
              item_type: itemType,
              scope: scope,
              points: t.points || 0,
              requirement: t.description || "Automaticky",
              locked: true,
              earned_at: null
            });
          }
        } else if (scope === 'PER_MASTER') {
          for (const masterId of masterIds) {
            // Check logic: must match template_id AND master_id
            const exists = certificates?.some(c => c.template_id === t.id && c.master_id === masterId);
            if (!exists) {
              toInsert.push({
                user_id: userId,
                template_id: t.id,
                master_id: masterId,
                title: t.title,
                item_type: itemType,
                scope: scope,
                points: t.points || 0,
                requirement: t.description || "Aktivuje mistr",
                locked: true,
                earned_at: null
              });
            }
          }
        }
      }

      if (toInsert.length > 0) {
        console.log(`📋 Přidávám ${toInsert.length} chybějících certifikátů...`);
        const { error: insertErr } = await supabase.from("certificates").insert(toInsert);
        if (insertErr) console.error("Insert error:", insertErr);

        // Refetch
        const { data: finalCerts } = await supabase
          .from("certificates")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        // Return refetched
        return finalCerts || [];
      }

      return (certificates || []).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } catch (err: any) {
      console.error("❌ Chyba v getCertificates:", err?.message || err);
      return [];
    }
  },

  // Certifikáty - Přidání
  async addCertificate(userId: string, title: string, category: string, points: number, requirement: string, locked: boolean) {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .insert([{ user_id: userId, title, category, points, requirement, locked, earned_at: null }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při přidávání certifikátu");
    }
  },

  // Certifikáty - Odemčení
  async unlockCertificate(certificateId: number, masterUserId?: string, templateId?: number) {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .update({ locked: false, earned_at: new Date().toISOString() })
        .eq("id", certificateId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      console.log(`🔓 Certifikát odemčen! Master: ${masterUserId}, TemplateID: ${templateId}, CertID: ${certificateId}`);

      if (masterUserId && templateId) {
        // Zkus nejprve smazat starý záznam pokud existuje (aby nebyla duplicita)
        await supabase.from("certificate_unlock_history").delete().eq("user_id", data.user_id).eq("template_id", templateId);

        await supabase
          .from("certificate_unlock_history")
          .insert([{
            user_id: data.user_id,
            template_id: templateId,
            unlocked_by: masterUserId
          }]);
      }

      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při odemčení certifikátu");
    }
  },

  // Certifikáty - Zamčení (zrušení aktivace)
  async lockCertificate(certificateId: number, templateId?: number) {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .update({ locked: true, earned_at: null })
        .eq("id", certificateId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (templateId && data?.user_id) {
        await supabase
          .from("certificate_unlock_history")
          .delete()
          .eq("user_id", data.user_id)
          .eq("template_id", templateId);
      }

      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při zamčení certifikátu");
    }
  },

  // Certifikáty - Najdi certificate podle user_id a title (certifikáty se hledají podle titulu šablony)
  async getCertificateByTitle(userId: string, title: string) {
    try {
      console.log("🔍 Hledám certificate - userId:", userId, "title:", title);

      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .ilike("title", title.trim())
        .maybeSingle();  // Vrátí null pokud nic nenajde, chyba jen pokud 2+ řádky

      if (error) {
        console.error("❌ Supabase error:", error?.message, error?.code);
        return null;
      }

      if (!data) {
        console.warn("⚠️ Certifikát nenalezen pro userId:", userId, "title:", title);
        return null;
      }

      console.log("✅ Certifikát nalezen:", data);
      return data;
    } catch (err: any) {
      console.error("❌ Chyba při hledání certifikátu:", err?.message);
      return null;
    }
  },

  // ============ TASKS ============
  // Úkoly - Stažení pro uživatele (jako apprentice nebo master)
  async getTasks(userId: string) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`apprentice_id.eq.${userId},master_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      console.error("Chyba při stažení úkolů:", err);
      return [];
    }
  },

  // Úkoly - Stažení pro učedníka
  async getTasksForApprentice(apprenticeId: string) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("apprentice_id", apprenticeId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení úkolů");
    }
  },

  // Úkoly - Stažení pro mistra (jeho učedníci)
  async getTasksForMaster(masterId: string) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("master_id", masterId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení úkolů");
    }
  },

  // Úkoly - Vytvoření (Mistr přiřazuje)
  async createTask(apprenticeId: string, masterId: string, projectId: number | null, title: string, description: string, dueDate: string | null) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([{ apprentice_id: apprenticeId, master_id: masterId, project_id: projectId, title, description, due_date: dueDate, completed: false }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při vytváření úkolu");
    }
  },

  // Úkoly - Označení jako hotové
  async completeTask(taskId: number) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci úkolu");
    }
  },

  // Úkoly - Smazání
  async deleteTask(taskId: number) {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při mazání úkolu");
    }
  },

  // ============ COMMENTS ============
  // Komentáře - Stažení pro uživatele (všechny jeho komentáře)
  async getComments(userId: string) {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      console.error("Chyba při stažení komentářů:", err);
      return [];
    }
  },

  // Komentáře - Stažení pro projekt
  async getCommentsForProject(projectId: number) {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení komentářů");
    }
  },

  // Komentáře - Přidání
  async addComment(projectId: number, userId: string, text: string) {
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert([{ project_id: projectId, user_id: userId, text }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při přidávání komentáře");
    }
  },

  // Komentáře - Smazání
  async deleteComment(commentId: number) {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při mazání komentáře");
    }
  },

  // ============ CERTIFICATE MANAGEMENT ============
  // Certifikáty - Stažení šablon
  async getCertificateTemplates() {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*, certificate_rules:certificate_unlock_rules(*)")
        .eq("visible_to_all", true);

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení certifikátů");
    }
  },

  async getAllCertificateTemplates() {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*, certificate_rules:certificate_unlock_rules(*)");

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení všech šablon");
    }
  },

  // Certifikáty - Přidání šablony
  async addCertificateTemplate(title: string, itemType: string, scope: string, points: number, description: string, ruleLogic: "AND" | "OR" = "AND") {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .insert([{
          title,
          item_type: itemType,
          scope: scope,
          points,
          description,
          visible_to_all: true,
          category: itemType === 'BADGE' ? 'Badge' : 'Certifikát', // Backwards compat/UI grouping
          rule_logic: ruleLogic
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při přidávání certifikátu");
    }
  },

  // Certifikáty - Aktualizace šablony
  async updateCertificateTemplate(templateId: number, title: string, points: number, itemType?: string, scope?: string, ruleLogic?: "AND" | "OR") {
    try {
      const updates: any = { title, points };
      if (itemType) updates.item_type = itemType;
      // Pro jistotu update category
      if (itemType) updates.category = itemType === 'BADGE' ? 'Badge' : 'Certifikát';
      if (scope) updates.scope = scope;
      if (ruleLogic) updates.rule_logic = ruleLogic;

      const { data, error } = await supabase
        .from("certificate_templates")
        .update(updates)
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci certifikátu");
    }
  },

  // Certifikáty - Smazání šablony
  async deleteCertificateTemplate(templateId: number) {
    try {
      const { error } = await supabase
        .from("certificate_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při mazání certifikátu");
    }
  },

  // Pravidla - Stažení
  async getCertificateUnlockRules(templateId: number) {
    try {
      const { data, error } = await supabase
        .from("certificate_unlock_rules")
        .select("*")
        .eq("template_id", templateId);

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || "Chyba při stažení pravidel");
    }
  },

  // Získat VŠECHNA pravidla najednou (optimalizace)
  async getAllCertificateUnlockRules() {
    try {
      const { data, error } = await supabase
        .from("certificate_unlock_rules")
        .select("*");

      if (error) throw new Error(error.message);
      return data || [];
    } catch (err: any) {
      console.error("❌ Chyba při stahování všech pravidel:", err);
      return [];
    }
  },

  // Pravidla - Přidání
  async addCertificateUnlockRule(templateId: number, ruleType: string, conditionType: string | null, conditionValue: number | null, description: string) {
    try {
      const { data, error } = await supabase
        .from("certificate_unlock_rules")
        .insert([{ template_id: templateId, rule_type: ruleType, condition_type: conditionType, condition_value: conditionValue, description }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při přidávání pravidla");
    }
  },

  // Pravidla - Aktualizace
  async updateCertificateUnlockRule(ruleId: number, updates: any) {
    try {
      const { data, error } = await supabase
        .from("certificate_unlock_rules")
        .update(updates)
        .eq("id", ruleId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci pravidla");
    }
  },

  // Pravidla - Smazání
  async deleteCertificateUnlockRule(ruleId: number) {
    try {
      const { error } = await supabase
        .from("certificate_unlock_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při mazání pravidla");
    }
  },

  // Kontrola odemknutí certifikátu
  async checkCertificateUnlock(userId: string, templateId: number, workHours: number, studyHours: number, projectCount: number, points: number, certificateId?: number) {
    try {
      const rules = await this.getCertificateUnlockRules(templateId);
      console.log(`🔍 Checking cert ${templateId} - rules:`, rules);

      // Pokud žádná pravidla, certifikát zůstane ZAMČENÝ
      if (!rules || rules.length === 0) {
        console.log(`🔒 Cert ${templateId}: Žádná pravidla -> ZAMČENÝ!`);
        return false;
      }

      // Pro MANUAL pravidla - zkontroluj jestli je v certificates s earned_at
      let query = supabase
        .from("certificates")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .eq("template_id", templateId)
        .not("earned_at", "is", null);

      if (certificateId) {
        query = query.eq("id", certificateId);
      }

      const unlockedCount = await query;

      if ((unlockedCount.count || 0) > 0) {
        console.log(`✅ Cert ${templateId}: MANUAL mistr odemknul`);
        return true;
      }

      const { data: tmpl } = await supabase.from("certificate_templates").select("rule_logic").eq("id", templateId).single();
      const logic = tmpl?.rule_logic || "AND";

      // Zkontroluj AUTO pravidla
      const autoRules = rules.filter((r: any) => r.rule_type !== "MANUAL");

      if (autoRules.length === 0) return false;

      const totalHours = workHours + studyHours;

      if (logic === "OR") {
        for (const rule of autoRules) {
          let conditionMet = false;
          if (rule.condition_type === "WORK_HOURS" && workHours >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "STUDY_HOURS" && studyHours >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "TOTAL_HOURS" && totalHours >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "PROJECTS" && projectCount >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "POINTS" && points >= (rule.condition_value || 0)) conditionMet = true;

          if (conditionMet) {
            console.log(`✅ Cert ${templateId}: OR logika - splněno pravidlo ${rule.condition_type}`);
            return true;
          }
        }
        console.log(`🔒 Cert ${templateId}: OR logika - nic nesplněno`);
        return false;
      } else {
        // AND - všechna musí platit
        for (const rule of autoRules) {
          let conditionMet = false;
          if (rule.condition_type === "WORK_HOURS" && workHours >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "STUDY_HOURS" && studyHours >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "TOTAL_HOURS" && totalHours >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "PROJECTS" && projectCount >= (rule.condition_value || 0)) conditionMet = true;
          if (rule.condition_type === "POINTS" && points >= (rule.condition_value || 0)) conditionMet = true;

          if (!conditionMet) {
            console.log(`🔒 Cert ${templateId}: AND logika - pravidlo ${rule.condition_type} nesplněno`);
            return false;
          }
        }

        console.log(`✅ Cert ${templateId}: Všechna pravidla splněna`);
        return true;
      }
    } catch (err: any) {
      console.error(`❌ Chyba v checkCertificateUnlock pro ${templateId}:`, err);
      return false;
    }
  },

  // Certifikáty - Odemknutí mistrem (MANUAL)
  async unlockCertificateForUser(userId: string, templateId: number, masterUserId?: string) {
    try {
      // 1. Fetch Template Details
      const { data: tmpl, error: tmplError } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (tmplError) throw new Error("Template not found");

      // 2. Check if certificate record exists (handle potential duplicates)
      const { data: existingCerts } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", userId)
        .eq("template_id", templateId);

      if (existingCerts && existingCerts.length > 0) {
        // Update ALL existing records
        const ids = existingCerts.map(c => c.id);
        const { error: updateError } = await supabase
          .from("certificates")
          .update({
            locked: false,
            earned_at: new Date().toISOString(),
            master_id: masterUserId || null
          })
          .in("id", ids);

        if (updateError) throw new Error(updateError.message);
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from("certificates")
          .insert([{
            user_id: userId,
            template_id: templateId,
            master_id: masterUserId || null,
            title: tmpl.title,
            item_type: (tmpl.category?.toLowerCase().includes("cert") || tmpl.category?.toLowerCase().includes("list")) ? "CERTIFICATE" : "BADGE",
            scope: tmpl.scope,
            points: tmpl.points,
            requirement: "Manuálně uděleno",
            locked: false,
            earned_at: new Date().toISOString()
          }]);

        if (insertError) throw new Error(insertError.message);
      }

      // 3. Record History
      const { data: rules } = await supabase
        .from("certificate_unlock_rules")
        .select("id")
        .eq("template_id", templateId)
        .eq("rule_type", "MANUAL")
        .maybeSingle();

      await supabase
        .from("certificate_unlock_history")
        .insert([{
          user_id: userId,
          template_id: templateId,
          unlocked_by: masterUserId,
          rule_id: rules?.id || null
        }]);

      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při odemykání certifikátu");
    }
  },

  // Certifikáty - Zamčení mistrem (MANUAL)
  // Certifikáty - Deaktivace mistrem (MANUAL) - Nyní maže záznam
  async lockCertificateForUser(userId: string, templateId: number) {
    try {
      // 1. Smazat záznam z certificates
      const { error: deleteCertError } = await supabase
        .from("certificates")
        .delete()
        .eq("user_id", userId)
        .eq("template_id", templateId);

      if (deleteCertError) throw deleteCertError;

      // History unlock records are preserved for audit trail (showing all masters who granted it)

      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při zamykání certifikátu");
    }
  },

  async getCertificateUnlockHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from("certificate_unlock_history")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("❌ Chyba při načítání historie certifikátů:", err);
      return [];
    }
  },

  // Update user credentials
  async updateUser(userId: string, updates: { email?: string; password?: string }) {
    try {
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při aktualizaci uživatele");
    }
  },

  // Admin Settings - Získat nastavení limitů hodin (implicitní hodnoty pro nové učedníky)
  async getAdminSettings() {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || {
        max_work_hours_day: 8,
        max_study_hours_day: 4,
        max_work_hours_week: 40,
        max_study_hours_week: 20,
        max_work_hours_month: 160,
        max_study_hours_month: 80,
        max_work_hours_year: 1920,
        max_study_hours_year: 960
      };
    } catch (err: any) {
      console.error("Error fetching admin settings:", err);
      return {
        max_work_hours_day: 8,
        max_study_hours_day: 4,
        max_work_hours_week: 40,
        max_study_hours_week: 20,
        max_work_hours_month: 160,
        max_study_hours_month: 80,
        max_work_hours_year: 1920,
        max_study_hours_year: 960
      };
    }
  },

  // Admin Settings - Uložit nastavení limitů hodin
  async saveAdminSettings(settings: {
    max_work_hours_day: number;
    max_study_hours_day: number;
    max_work_hours_week: number;
    max_study_hours_week: number;
    max_work_hours_month: number;
    max_study_hours_month: number;
    max_work_hours_year: number;
    max_study_hours_year: number;
  }, updatedBy: string) {
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          id: 1,
          ...settings,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        });

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při ukládání nastavení");
    }
  },

  // User Hour Limits - Získat limity pro konkrétního učedníka
  async getUserHourLimits(userId: string) {
    try {
      const { data, error } = await supabase
        .from("user_hour_limits")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (err: any) {
      console.error("Error fetching user hour limits:", err);
      return null;
    }
  },

  // User Hour Limits - Vytvořit limity pro nového učedníka (z admin_settings)
  async createUserHourLimits(userId: string, limits?: {
    max_work_hours_day: number;
    max_study_hours_day: number;
    max_work_hours_week: number;
    max_study_hours_week: number;
    max_work_hours_month: number;
    max_study_hours_month: number;
    max_work_hours_year: number;
    max_study_hours_year: number;
  }) {
    try {
      const defaultLimits = limits || await this.getAdminSettings();

      const { error } = await supabase
        .from("user_hour_limits")
        .insert({
          user_id: userId,
          max_work_hours_day: defaultLimits.max_work_hours_day,
          max_study_hours_day: defaultLimits.max_study_hours_day,
          max_work_hours_week: defaultLimits.max_work_hours_week,
          max_study_hours_week: defaultLimits.max_study_hours_week,
          max_work_hours_month: defaultLimits.max_work_hours_month,
          max_study_hours_month: defaultLimits.max_study_hours_month,
          max_work_hours_year: defaultLimits.max_work_hours_year,
          max_study_hours_year: defaultLimits.max_study_hours_year
        });

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při vytváření limitů učedníka");
    }
  },

  // User Hour Limits - Aktualizovat limity učedníka
  async updateUserHourLimits(userId: string, limits: {
    max_work_hours_day: number;
    max_study_hours_day: number;
    max_work_hours_week: number;
    max_study_hours_week: number;
    max_work_hours_month: number;
    max_study_hours_month: number;
    max_work_hours_year: number;
    max_study_hours_year: number;
  }) {
    try {
      const { error } = await supabase
        .from("user_hour_limits")
        .upsert({
          user_id: userId,
          ...limits,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Chyba při ukládání limitů učedníka");
    }
  },

  // Notifications
  async getNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching notifications:", err);
      return [];
    }
  },

  async markNotificationRead(id: number) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  },

  async markAllNotificationsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  },

  async createNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' | 'admin' = 'info') {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type
        });
      if (error) throw error;
    } catch (err) {
      console.error("Error creating notification:", err);
    }
  }
};
