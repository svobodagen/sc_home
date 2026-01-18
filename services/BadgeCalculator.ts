import { getInitials } from "@/utils/string";

// --- TYPES ---

export type UserRole = "Mistr" | "Učedník" | "Host" | "Admin";

export interface BadgeTemplate {
    id: string;
    title: string;
    description?: string;
    points: number;
    category: string;
    rule_logic?: 'AND' | 'OR';
}

export interface BadgeRule {
    id: string;
    template_id: string;
    rule_type: "MANUAL" | "AUTOMATIC";
    condition_type: "WORK_HOURS" | "STUDY_HOURS" | "TOTAL_HOURS" | "PROJECTS" | "NONE";
    condition_value: number;
}

export interface DBRecord {
    id: string; // row id
    template_id: string;
    user_id: string;
    master_id?: string; // Who granted it (for certificates) or context
    unlocked_by?: string; // Legacy field
    locked: boolean;
    earned_at?: string;
}

export interface UserStats {
    workHours: number;
    studyHours: number;
    totalHours: number;
    projectCount: number;
}

export interface CalcContext {
    role: UserRole;
    userStats: UserStats; // Stats relevant to the view (Master view -> stats purely from that master)
    dbRecords: DBRecord[]; // All records for this template (could be multiple if from multiple masters?)
    rules: BadgeRule[];
    allUsers: any[]; // For name resolution
    unlockHistory?: any[]; // History of unlocks to find all masters
    currentMasterId?: string; // If filtering by master (or if role is Master)
    targetUserId?: string; // ID of the apprentice being viewed
}

export interface BadgeDisplayData {
    // Identification
    templateId: string;
    title: string;
    category: "Odznak" | "Certifikát";
    points: number;

    // Status
    isLocked: boolean;

    // UI Elements
    iconColor: "colored" | "gray";
    initials: string[]; // Initials to show in corner

    // Texts
    headerTitle: string; // Same as title + category usually
    infoText: string; // "Stav: Splněno", "Udělili: ..."
    ruleText: string; // "Odpracuj 100h" or "Uděluje mistr"

    // Actions
    actionType: "NONE" | "ACTIVATE" | "DEACTIVATE";

    // Meta needed for DB Sync
    dbRecordId?: string; // If exists
    shouldUpdateDB: boolean; // If calculated status differs from DB (for Auto badges)
    newLockedStatus?: boolean;
    earnedByNames?: string[];
}

// --- CORE LOGIC ---

export const calculateBadgeStatus = (
    template: BadgeTemplate,
    context: CalcContext
): BadgeDisplayData => {
    const { role, userStats, dbRecords, rules, allUsers, currentMasterId, unlockHistory } = context;

    // 1. Determine Type
    const catLower = (template.category || "").toLowerCase();
    const hasAutoRules = rules.some(r => r.rule_type !== "MANUAL");
    const isBadge = catLower.includes("badge") || catLower.includes("odznak") || hasAutoRules;
    const type = isBadge ? "Odznak" : "Certifikát";

    // 2. Filter Rules (Strict Enforcement)
    let effectiveRules: BadgeRule[] = [];
    if (isBadge) {
        // Badges = Auto Only
        effectiveRules = rules.filter(r => r.rule_type !== "MANUAL");
    } else {
        // Certificates = Manual Only
        effectiveRules = []; // No auto rules apply
    }

    // 3. Calculate Logical Status (Is it met?)
    let isMet = false;

    if (isBadge) {
        // AUTOMATIC LOGIC
        if (effectiveRules.length > 0) {
            const logic = template.rule_logic || 'AND';

            const checkRule = (r: BadgeRule) => {
                if (r.condition_type === "WORK_HOURS") return context.userStats.workHours >= r.condition_value;
                if (r.condition_type === "STUDY_HOURS") return context.userStats.studyHours >= r.condition_value;
                if (r.condition_type === "TOTAL_HOURS") return context.userStats.totalHours >= r.condition_value;
                if (r.condition_type === "PROJECTS") return context.userStats.projectCount >= r.condition_value;
                return true;
            };

            if (logic === 'OR') {
                isMet = effectiveRules.some(checkRule);
            } else {
                isMet = effectiveRules.every(checkRule);
            }
        } else {
            // No rules? Default to locked unless maybe it's a legacy badge?
            isMet = false;
        }
    } else {
        // MANUAL LOGIC
        // Fixed: Check filtering properly regardless of role
        if (currentMasterId) {
            // Context filtered by Master (Apprentice viewing Master, or Master viewing Self)
            // Check if THIS master granted it (check history too if record overwritten?)
            // If dbRecord says master_id = B, but master A also granted it, and we filter A.
            // We should check history for A!
            const inHistory = unlockHistory?.some(h => String(h.template_id) === template.id && String(h.unlocked_by) === String(currentMasterId));
            const myRecord = dbRecords.find(r => String(r.master_id || r.unlocked_by) === String(currentMasterId));

            // If checking "Is Met by This Master", history is enough if it implies active.
            // But if Locked, history is cleared. So existence in history implies active.
            // Unless dbRecords says locked?
            // If ANY record is locked in DB, it overrides history?
            // Actually, if certificates table has 1 row per user/template. If it is UNLOCKED, it is unlocked.
            // If I granted it, it should be in history.

            const isUnlockedGlobal = dbRecords.some(r => !r.locked);
            isMet = (!!myRecord && !myRecord.locked) || (isUnlockedGlobal && !!inHistory);
        } else {
            // Global view: Check if ANY active record exists
            const anyActive = dbRecords.some(r => !r.locked);
            isMet = anyActive;
        }
    }

    // 4. Determine Final Locked Status & DB Sync
    let isLocked = !isMet;
    let shouldUpdateDB = false;

    // DB Sync is only for Auto Badges
    if (isBadge) {
        // Simplification: assume one record per user/template for badges usually
        const record = dbRecords[0];

        const dbLocked = record ? record.locked : true;

        if (isMet && dbLocked) {
            shouldUpdateDB = true;
            // Unlocking
        } else if (!isMet && !dbLocked) {
            shouldUpdateDB = true;
            // Locking
        }

        // If we need to lock, enforce it visually immediately
        if (shouldUpdateDB && !isMet) {
            isLocked = true;
        }
        // If we need to unlock, enforce it visually immediately
        if (shouldUpdateDB && isMet) {
            isLocked = false;
        }
    }

    // 5. Generate Text & UI Data

    // -- Rule Text --
    let ruleText = "";
    if (isBadge) {
        if (effectiveRules.length === 0) ruleText = "Automaticky dle pravidel";
        else {
            const parts = effectiveRules.map(r => {
                if (r.condition_type === "WORK_HOURS") return `Odpracuj ${r.condition_value} hodin`;
                if (r.condition_type === "STUDY_HOURS") return `Nastuduj ${r.condition_value} hodin`;
                if (r.condition_type === "TOTAL_HOURS") return `Celkem ${r.condition_value} hodin`;
                if (r.condition_type === "PROJECTS") return `Dokonči ${r.condition_value} projektů`;
                return "";
            });
            ruleText = parts.filter(Boolean).join(" • ");
        }
    } else {
        ruleText = "Uděluje mistr";
    }

    // -- Info Context & Initials --
    let infoText = "";
    let initials: string[] = [];

    // Helper to resolve names
    const resolveNames = (ids: string[]) => {
        return ids.map(id => {
            const u = allUsers.find(u => String(u.id) === String(id));
            return u ? u.name : "Neznámý";
        }).filter(Boolean);
    };

    const resolveInitials = (ids: string[]) => {
        return ids.map(id => {
            const u = allUsers.find(u => String(u.id) === String(id));
            return u ? getInitials(u.name) : "?";
        }).filter(Boolean);
    };

    if (role === "Mistr") {
        // MISTR VIEW
        if (isMet) {
            infoText = `Stav u vás: Splněno`;

            // Show Apprentice Initials (User Request: "iniciály učedníků!!! ne mistra")
            if (context.targetUserId) {
                const u = allUsers.find(u => String(u.id) === String(context.targetUserId));
                if (u) initials = [getInitials(u.name)];
            } else {
                // Fallback from record
                const rec = dbRecords.find(r => !r.locked);
                if (rec) {
                    const u = allUsers.find(u => String(u.id) === String(rec.user_id));
                    if (u) initials = [getInitials(u.name)];
                }
            }
        } else {
            infoText = `Stav u vás: Nesplněno`;
        }
    } else {
        // APPRENTICE / HOST VIEW
        if (isMet) {
            // Find who granted/where it was met.
            let relevantRecords = dbRecords.filter(r => !r.locked);

            let masterIds: string[] = [];

            // Use History if available for more accumulated data
            if (unlockHistory && unlockHistory.length > 0) {
                const relevantHistory = unlockHistory.filter(h => String(h.template_id) === String(template.id));
                const historyIds = relevantHistory.map(h => h.unlocked_by).filter(Boolean);
                masterIds.push(...historyIds);
            }

            // Also include current active record (legacy support or if history missing)
            const currentRecordIds = relevantRecords.map(r => r.master_id || r.unlocked_by).filter(Boolean) as string[];
            masterIds.push(...currentRecordIds);

            // Fix: Filter info by Current Master Filter if active
            if (currentMasterId) {
                masterIds = masterIds.filter(mid => String(mid) === String(currentMasterId));
            }

            // Fix: Deduplicate IDs
            masterIds = [...new Set(masterIds)];

            if (isBadge) {
                // For badges
                infoText = "Získáno";
                if (masterIds.length > 0) {
                    const names = resolveNames(masterIds);
                    infoText = `Získáno u mistra: ${names.join(", ")}`;
                    initials = resolveInitials(masterIds);
                } else {
                    // Met globally (sum of masters) but no specific attribution
                    initials = ["+"];
                    infoText = "Získáno (součet mistrů)";
                }
            } else {
                // Certificates
                const names = resolveNames(masterIds);
                infoText = `Udělili mistři: ${names.join(", ")}`;
                initials = resolveInitials(masterIds);
            }
        } else {
            // Not Met
            infoText = isBadge ? `Pravidla: ${ruleText}` : "Stav: Zatím neuděleno";
        }
    }

    // -- Actions --
    let actionType: "NONE" | "ACTIVATE" | "DEACTIVATE" = "NONE";
    if (role === "Mistr" && !isBadge) {
        // Master can toggle Certificates
        actionType = isMet ? "DEACTIVATE" : "ACTIVATE";
    }

    return {
        templateId: template.id,
        title: `${template.title} ${type}`,
        category: type as any,
        points: template.points,
        isLocked,
        iconColor: isLocked ? "gray" : "colored",
        initials: isLocked ? [] : initials, // STRICT RULE: No initials if inactive
        headerTitle: `${template.title}`,
        infoText,
        ruleText,
        actionType,
        dbRecordId: dbRecords[0]?.id,
        shouldUpdateDB,
        newLockedStatus: isLocked
    };
};
