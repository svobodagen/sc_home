import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { ProjectCard } from "@/components/ProjectCard";
import { AchievementBadge } from "@/components/AchievementBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { GoalProgressBox } from "@/components/GoalProgressBox";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useNavigation } from "@react-navigation/native";
import { useData, AdminSettings } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "@/services/api";

import { NoApprenticeSelected } from "@/components/NoApprenticeSelected";
import { getInitials } from "@/utils/string";
import { useMaster } from "@/contexts/MasterContext";
import { BadgeDisplayData, calculateBadgeStatus, BadgeRule } from "@/services/BadgeCalculator";

export default function DashboardScreen() {
  const { theme } = useTheme();
  const insets = useScreenInsets({ hasTransparentHeader: false });
  const navigation = useNavigation();
  const { user } = useAuth();
  const { selectedApprenticeId } = useMaster();
  const { userData, adminSettings, getRecentProjects, allUsers, userLimits } = useData();

  const [selectedBadge, setSelectedBadge] = useState<BadgeDisplayData | null>(null);
  const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
  const [apprenticeCount, setApprenticeCount] = useState(0);

  // New State for Calculator Data
  const [displayBadges, setDisplayBadges] = useState<BadgeDisplayData[]>([]);
  const [displayCerts, setDisplayCerts] = useState<BadgeDisplayData[]>([]);

  // Stats display
  const [statsSummary, setStatsSummary] = useState({
    totalHours: 0,
    workHours: 0,
    studyHours: 0,
    projectCount: 0
  });

  useFocusEffect(
    React.useCallback(() => {
      const loadDashboardData = async () => {
        let currentUserId = "";
        let roleForCalc: "Mistr" | "Učedník" = "Učedník";
        let masterFilterId: string | undefined = undefined;

        if (user?.role === "Mistr") {
          currentUserId = selectedApprenticeId || "";
          roleForCalc = "Mistr";
          masterFilterId = user.id; // Master views his perspective
        } else if (user?.role === "Učedník") {
          currentUserId = user.id;
          roleForCalc = "Učedník";
          masterFilterId = userData.selectedMasterId || undefined; // Apprentice filter
        }

        // OPTIMIZATION: Wait for allUsers to be loaded to avoid double-fetch and "?" flash
        if (allUsers.length === 0) return;

        if (!currentUserId) {
          if (user?.role === "Mistr" && !selectedApprenticeId) {
            // Aggregate stats for all apprentices
            try {
              const apps = await api.getApprenticesForMaster(user.id);
              setApprenticeCount(apps.length);

              const projs = await api.getProjectsForMaster(user.id);

              const projIds = projs.map((p: any) => p.id);
              const hours = await api.getWorkHoursForProjects(projIds);

              const wSum = hours.filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);
              const sSum = hours.filter((h: any) => h.description && /studium|study/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);

              setStatsSummary({
                workHours: wSum,
                studyHours: sSum,
                totalHours: wSum + sSum,
                projectCount: projs.length
              });

              // Load Badges for All
              // Load Badges for All (LIVE CALCULATION)
              const tmpls = await api.getAllCertificateTemplates();
              const rules = await api.getAllCertificateUnlockRules().catch(() => []);

              // We need full data for calculation: Hours, Projects, Certs for ALL apprentices
              const appIds = apps.map((a: any) => a.apprenticeId);

              const apprenticesDataPromises = apps.map(async (app: any) => {
                const [hours, projs, certs, history] = await Promise.all([
                  api.getWorkHours(app.apprenticeId).catch(() => []),
                  api.getProjects(app.apprenticeId).catch(() => []),
                  api.getCertificates(app.apprenticeId).catch(() => []),
                  api.getCertificateUnlockHistory(app.apprenticeId).catch(() => [])
                ]);
                return { apprenticeId: app.apprenticeId, apprenticeName: app.apprenticeName, hours, projs, certs, history };
              });

              const apprenticesData = await Promise.all(apprenticesDataPromises);
              const currentMasterId = user.id;

              const newBadges: BadgeDisplayData[] = [];
              const newCerts: BadgeDisplayData[] = [];

              tmpls.forEach((tmpl: any) => {
                const catLower = (tmpl.category || "").toLowerCase();
                const isBadge = catLower.includes("badge") || catLower.includes("odznak");
                const type = isBadge ? "Odznak" : "Certifikát";
                const tmplRules = rules.filter((r: any) => r.template_id === tmpl.id);

                const successfulApprentices: any[] = [];

                apprenticesData.forEach(ad => {
                  // Filter details by Current Master
                  const masterHours = ad.hours.filter((h: any) => String(h.master_id) === String(currentMasterId));
                  const masterProjs = ad.projs.filter((p: any) => String(p.master_id) === String(currentMasterId));

                  const myStats = {
                    workHours: masterHours.filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || 0), 0),
                    studyHours: masterHours.filter((h: any) => h.description && /studium|study/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || 0), 0),
                    totalHours: 0,
                    projectCount: masterProjs.length
                  };
                  myStats.totalHours = myStats.workHours + myStats.studyHours;

                  const relevantRecords = ad.certs.filter((c: any) => String(c.template_id) === String(tmpl.id));

                  const result = calculateBadgeStatus(tmpl, {
                    role: "Mistr",
                    userStats: myStats,
                    dbRecords: relevantRecords,
                    rules: tmplRules,
                    allUsers: allUsers,
                    currentMasterId: currentMasterId,
                    unlockHistory: ad.history,
                    targetUserId: ad.apprenticeId
                  });

                  if (!result.isLocked) {
                    successfulApprentices.push(ad);
                  }
                });

                if (successfulApprentices.length > 0) {
                  const names = successfulApprentices.map(a => a.apprenticeName);
                  const initials = successfulApprentices.map(a => getInitials(a.apprenticeName));

                  const item: BadgeDisplayData = {
                    templateId: String(tmpl.id),
                    title: `${tmpl.title} ${type}`,
                    category: type as any,
                    points: tmpl.points,
                    isLocked: false,
                    iconColor: "colored",
                    initials: initials,
                    earnedByNames: names,
                    headerTitle: tmpl.title,
                    infoText: `Získalo: ${names.length} učedníků`,
                    ruleText: type === 'Odznak' ? "Dle pravidel" : "Uděluje mistr",
                    actionType: "NONE",
                    shouldUpdateDB: false
                  };

                  if (type === "Odznak") newBadges.push(item);
                  else newCerts.push(item);
                }
              });

              // Robust Sort
              const sortFn = (a: BadgeDisplayData, b: BadgeDisplayData) => {
                const idA = parseInt(a.templateId);
                const idB = parseInt(b.templateId);
                if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
                return String(a.templateId).localeCompare(String(b.templateId));
              };

              newBadges.sort(sortFn);
              newCerts.sort(sortFn);

              setDisplayBadges(newBadges);
              setDisplayCerts(newCerts);

            } catch (e) {
              console.error("Aggregation error:", e);
              setDisplayBadges([]);
              setDisplayCerts([]);
            }
          } else {
            setStatsSummary({ totalHours: 0, workHours: 0, studyHours: 0, projectCount: 0 });
            setDisplayBadges([]);
            setDisplayCerts([]);
          }
          return;
        }

        try {
          // 1. Load Data
          const [workHours, projects, templates, dbCerts, allRules, history] = await Promise.all([
            api.getWorkHours(currentUserId).catch(() => []),
            api.getProjects(currentUserId).catch(() => []),
            api.getCertificateTemplates().catch(() => []),
            api.getCertificates(currentUserId).catch(() => []),
            api.getAllCertificateUnlockRules().catch(() => []),
            api.getCertificateUnlockHistory(currentUserId).catch(() => [])
          ]);

          // 2. Prepare Stats & Context
          // If Master -> Filter stats by ME. If Apprentice with Filter -> Filter by Master.
          let relevantWorkHours = workHours;
          let relevantProjects = projects;

          if (masterFilterId) {
            relevantWorkHours = workHours.filter((h: any) => String(h.master_id) === String(masterFilterId));
            relevantProjects = projects.filter((p: any) => String(p.master_id) === String(masterFilterId));
          }

          const wSum = relevantWorkHours.filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);
          const sSum = relevantWorkHours.filter((h: any) => h.description && /studium|study/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);

          const stats = {
            workHours: wSum,
            studyHours: sSum,
            totalHours: wSum + sSum,
            projectCount: relevantProjects?.length || 0
          };

          setStatsSummary(stats);

          // Set Apprentice Data for Master View Context (Graphs etc need it)
          if (user?.role === "Mistr") {
            const appName = allUsers.find((u: any) => u.id === currentUserId)?.name;
            setSelectedApprenticeData({
              id: currentUserId,
              name: appName,
              workHours: relevantWorkHours, // For GoalBox
              projects: relevantProjects,
              projectCount: relevantProjects.length
            });
          } else {
            setSelectedApprenticeData(null);
          }

          // 3. Process Templates
          const processed: BadgeDisplayData[] = await Promise.all(templates.map(async (tmpl: any) => {
            const relevantRecords = dbCerts.filter((c: any) => String(c.template_id) === String(tmpl.id));
            const tmplRules = allRules.filter((r: any) => r.template_id === tmpl.id);
            const tmplWorkH = workHours; // Full context for per-master check
            const tmplProjs = projects;

            let result = calculateBadgeStatus(tmpl, {
              role: roleForCalc,
              userStats: stats,
              dbRecords: relevantRecords,
              rules: tmplRules,
              allUsers: allUsers,
              currentMasterId: masterFilterId,
              unlockHistory: history,
              targetUserId: currentUserId
            });

            // SMART ATTRIBUTION FIX:
            // If met globally but calculator gave "+" (no specific attribution in DB/Context),
            // check if any single master stats satisfy the condition.
            if (!result.isLocked && result.initials.includes("+")) {
              const involvedMasterIds = [...new Set([
                ...tmplWorkH.map((h: any) => h.master_id),
                ...tmplProjs.map((p: any) => p.master_id)
              ])].filter(Boolean);

              // DEBUG LOG FOR TARGET BADGES
              if (tmpl.title.includes("Student 21") || tmpl.title.includes("50 hodin")) {
                console.log(`🐛 SMART ATTR CHECK for ${tmpl.title}:`, { involvedCount: involvedMasterIds.length, detailed: involvedMasterIds });
              }

              const qualifyingMasterIds: string[] = [];

              involvedMasterIds.forEach(mid => {
                const mHours = tmplWorkH.filter((h: any) => String(h.master_id) === String(mid));
                const mProjs = tmplProjs.filter((p: any) => String(p.master_id) === String(mid));

                const wSum = mHours.filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);
                const sSum = mHours.filter((h: any) => h.description && /studium|study/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);

                const mStats = {
                  workHours: wSum,
                  studyHours: sSum,
                  totalHours: wSum + sSum,
                  projectCount: mProjs.length
                };

                // Run calc for this master
                const mResult = calculateBadgeStatus(tmpl, {
                  role: "Mistr", // Simulate Master View to check active status
                  userStats: mStats,
                  dbRecords: [], // Don't rely on DB for this check, purely stats
                  rules: tmplRules,
                  allUsers: allUsers,
                  unlockHistory: history,
                } as any);

                if ((tmpl.title.includes("Student 21") || tmpl.title.includes("50 hodin"))) {
                  console.log(`   > Checking Master ${mid}:`, {
                    stats: mStats,
                    isLocked: mResult.isLocked
                  });
                }

                if (!mResult.isLocked) {
                  qualifyingMasterIds.push(String(mid));
                }
              });

              if (qualifyingMasterIds.length > 0) {
                // Override with qualifying masters
                const qNames = qualifyingMasterIds.map(id => allUsers.find((u: any) => String(u.id) === String(id))?.name || "Neznámý");
                result.initials = qualifyingMasterIds.map(id => getInitials(allUsers.find((u: any) => String(u.id) === String(id))?.name));
                result.infoText = `Získáno u mistra: ${qNames.join(", ")}`;

                if (tmpl.title.includes("Student 21") || tmpl.title.includes("50 hodin")) {
                  console.log(`   ✅ MATCH FOUND: ${qNames.join(", ")}`);
                }
              }
            }


            // DB Sync (Auto-Lock/Unlock handling)
            // Dashboard is the primary place for this sync
            if (result.shouldUpdateDB) {
              console.log(`⚠️ DB Sync needed for ${tmpl.title} (User: ${currentUserId}): ${result.newLockedStatus ? "LOCK" : "UNLOCK"}`);
              if (result.newLockedStatus) {
                await api.lockCertificateForUser(currentUserId, tmpl.id).catch(e => console.error(e));
              } else {
                // Unlock needs context? 
                // If we are auto-unlocking, we usually attribute to System or Current Master logic?
                // api.unlockCertificateForUser(userId, tmplId, masterId)
                // If no masterId provided, it might default.
                // For auto badges, master_id is often irrelevant or set to 'system' logic.
                await api.unlockCertificateForUser(currentUserId, tmpl.id).catch(e => console.error(e));
              }
            }

            return result;
          }));

          // 4. Split & Filter (Show only Unlocked/Active in Dashboard Scroller)
          // But wait, user might want to see progress? Usually Dashboard shows achievements (unlocked).
          // Let's filter !isLocked.

          const activeItems = processed.filter(i => !i.isLocked);
          activeItems.sort((a, b) => (parseInt(a.templateId) || 0) - (parseInt(b.templateId) || 0));

          setDisplayBadges(activeItems.filter(i => i.category === "Odznak"));
          setDisplayCerts(activeItems.filter(i => i.category === "Certifikát"));

        } catch (e) {
          console.error("Dashboard Load Error:", e);
        }
      };

      loadDashboardData();
    }, [user, selectedApprenticeId, userData.selectedMasterId, allUsers.length])
  );

  // Determine recent projects list source



  // Determine recent projects list source
  const recentProjects = user?.role === "Mistr" && selectedApprenticeData
    ? (selectedApprenticeData.projects || []).slice(0, 3)
    : getRecentProjects().filter((p: any) => !userData.selectedMasterId || p.master_id === userData.selectedMasterId);

  // Helper for Modal
  const ModalContent = () => {
    if (!selectedBadge) return null;
    const item = selectedBadge;
    const isGray = item.iconColor === "gray"; // Should be colored if unlocked
    const primaryColor = item.category === "Odznak" ? theme.primary : theme.secondary;

    return (
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable
          onPress={() => setSelectedBadge(null)}
          style={[styles.modalOverlay, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: primaryColor,
              },
            ]}
          >
            <View style={[styles.modalIconContainer, { backgroundColor: primaryColor + "20" }]}>
              <Feather name={item.category === "Odznak" ? "award" : "file-text"} size={48} color={primaryColor} />
            </View>

            <ThemedText style={[styles.modalTitle, { color: primaryColor, fontWeight: "700" }]}>
              {item.headerTitle}
            </ThemedText>

            <ThemedText style={[styles.modalCategory, { color: theme.textSecondary }]}>
              {item.category}
            </ThemedText>

            <View style={[styles.masterNameBox, { width: "100%", alignItems: 'center' }]}>
              {item.earnedByNames && item.earnedByNames.length > 0 ? (
                <View>
                  <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary, textAlign: 'center' }]}>Získali:</ThemedText>
                  {item.earnedByNames.map((n, idx) => (
                    <ThemedText key={idx} style={{ color: theme.text, fontWeight: '700', textAlign: 'center' }}>{n}</ThemedText>
                  ))}
                </View>
              ) : (
                <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary }]}>
                  Učedník: <ThemedText style={{ color: theme.text, fontWeight: '700' }}>
                    {user?.role === "Mistr" ? (selectedApprenticeData?.name || "Učedník") : "Já"}
                  </ThemedText>
                </ThemedText>
              )}
            </View>

            <View style={[styles.masterNameBox, { marginTop: Spacing.sm }]}>
              <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary, textAlign: 'center' }]}>
                {item.infoText.split(": ")[0]}:{"\n"}
                <ThemedText style={{ color: primaryColor, fontWeight: '600' }}>
                  {item.infoText.split(": ")[1] || ""}
                </ThemedText>
              </ThemedText>
            </View>

            <View style={[styles.requirementBox, { backgroundColor: theme.backgroundRoot, borderColor: primaryColor }]}>
              <ThemedText style={[styles.requirementLabel, { color: theme.textSecondary }]}>
                Podmínky pro získání:
              </ThemedText>
              <ThemedText style={[styles.requirementText, { color: theme.text }]}>
                {item.ruleText}
              </ThemedText>
            </View>

            <View style={styles.modalFooter}>
              <View style={styles.pointsRow}>
                <Feather name="zap" size={16} color={primaryColor} />
                <ThemedText style={[styles.pointsValue, { color: primaryColor, fontWeight: "700" }]}>
                  {item.points} bodů
                </ThemedText>
              </View>
              <ThemedText style={[styles.unlockedLabel, { color: primaryColor }]}>
                ✓ Odemčeno
              </ThemedText>
            </View>

            <Pressable
              onPress={() => setSelectedBadge(null)}
              style={[styles.closeButton, { backgroundColor: primaryColor }]}
            >
              <ThemedText style={styles.closeButtonText}>Zavřít</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingTop: 38, paddingBottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {user?.role === "Mistr" && !selectedApprenticeId && (
        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.backgroundDefault,
            borderRadius: BorderRadius.md,
            padding: Spacing.md,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
          }}>
            <View style={{
              width: 40, height: 40, borderRadius: BorderRadius.sm,
              backgroundColor: "#A855F7" + '15',
              alignItems: 'center', justifyContent: 'center',
              marginRight: Spacing.md
            }}>
              <Feather name="users" size={20} color="#A855F7" />
            </View>
            <ThemedText style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Počet učedníků</ThemedText>

            <View style={{ flex: 1 }} />

            <ThemedText style={{ fontSize: 24, fontWeight: '700', lineHeight: 28, color: "#A855F7" }}>{apprenticeCount}</ThemedText>
          </View>
        </View>
      )}

      <View style={[styles.statsContainer, { marginBottom: Spacing.md }]}>
        <StatCard icon="clock" label="Celkem hodin" value={`${Math.round(statsSummary.totalHours * 10) / 10}h`} color={theme.text} />
        <View style={{ width: Spacing.md }} />
        <StatCard icon="folder" label="Projekty" value={String(statsSummary.projectCount)} color={theme.text} />
      </View>
      <View style={styles.statsContainer}>
        <StatCard icon="briefcase" label="Práce" value={`${Math.round(statsSummary.workHours * 10) / 10}h`} color={theme.primary} />
        <View style={{ width: Spacing.md }} />
        <StatCard icon="book" label="Studium" value={`${Math.round(statsSummary.studyHours * 10) / 10}h`} color={theme.secondary} />
      </View>



      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
        <GoalProgressBox
          userId={user?.role === "Mistr" ? (selectedApprenticeId || undefined) : user?.id}
          userLimits={userLimits}
          workHours={user?.role === "Mistr" ? selectedApprenticeData?.workHours : undefined}
        />
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Poslední projekty</ThemedText>
        <Pressable onPress={() => navigation.navigate("ProjectsTab" as never)}>
          <ThemedText style={[styles.seeAll, { color: theme.primary }]}>Zobrazit vše</ThemedText>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        {recentProjects.map((project: any) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            date={project.created_at ? new Date(project.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" }) : ""}
            imageUrl={project.image ? { uri: project.image } : undefined}
            category={project.category}
            onPress={() => (navigation.navigate as any)("ProjectDetail", {
              project,
              projectIndex: recentProjects.indexOf(project),
              apprenticeId: user?.role === "Mistr" ? (selectedApprenticeId || undefined) : undefined,
              projectList: recentProjects
            })}
            masterComment={project.master_comment}
            isLiked={project.is_liked}
            authorName={user?.role === "Mistr" ? allUsers.find(u => u.id === project.user_id)?.name : undefined}
            masterName={project.master_id ? allUsers.find(u => u.id === project.master_id)?.name : undefined}
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>ODZNAKY</ThemedText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
        {displayBadges.length > 0 ? (
          displayBadges.map((badge: BadgeDisplayData) => (
            <View key={badge.templateId} style={{ marginRight: Spacing.md }}>
              <AchievementBadge item={badge} onPress={() => setSelectedBadge(badge)} />
            </View>
          ))
        ) : (
          <View style={{ paddingLeft: Spacing.lg }}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Zatím žádné odznaky</ThemedText>
          </View>
        )}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>CERTIFIKÁTY</ThemedText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
        {displayCerts.length > 0 ? (
          displayCerts.map((cert: BadgeDisplayData) => (
            <View key={cert.templateId} style={{ marginRight: Spacing.md }}>
              <AchievementBadge item={cert} onPress={() => setSelectedBadge(cert)} />
            </View>
          ))
        ) : (
          <View style={{ paddingLeft: Spacing.lg }}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Zatím žádné certifikáty</ThemedText>
          </View>
        )}
      </ScrollView>

      <ModalContent />
      <View style={{ height: Spacing["3xl"] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.lg,
  },
  seeAll: {
    ...Typography.body,
    fontWeight: "600",
  },
  achievementsScroll: {
    paddingLeft: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  badgeWrapper: {
    marginRight: Spacing.md,
  },
  // Removed old badgeCard styles
  emptyText: {
    ...Typography.body,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    width: "85%",
    borderWidth: 2,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.title,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  modalCategory: {
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  miniBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 2,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 12,
  },
  masterNameBox: {
    marginBottom: Spacing.md,
  },
  masterNameLabel: {
    ...Typography.small,
  },
  requirementBox: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    width: "100%",
  },
  requirementLabel: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  requirementText: {
    ...Typography.body,
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: Spacing.lg,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pointsValue: {
    ...Typography.body,
  },
  unlockedLabel: {
    ...Typography.small,
    fontWeight: "700",
  },
  closeButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    ...Typography.body,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
