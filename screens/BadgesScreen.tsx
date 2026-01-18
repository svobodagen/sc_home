import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { calculateBadgeStatus, BadgeDisplayData } from "@/services/BadgeCalculator";
import { AchievementBadge } from "@/components/AchievementBadge";
import { getInitials } from "@/utils/string";

export default function BadgesScreen() {
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const { allUsers, userData } = useData(); // Context data
  const [showBadges, setShowBadges] = useState(true);

  // Data State
  const [displayItems, setDisplayItems] = useState<BadgeDisplayData[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDisplayData | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const loadAndCalculateData = async () => {
    try {
      console.log("🔄 Loading Badge Data via Calculator...");
      if (!user?.id) return;
      if (allUsers.length === 0) return; // Wait for users to avoid flash

      const selectedMasterId = userData.selectedMasterId;

      // 1. Fetch Raw Data
      const [dbCerts, hours, projs, templates, mstrConns, allRules, history] = await Promise.all([
        api.getCertificates(user.id).catch(() => []),
        api.getWorkHours(user.id).catch(() => []),
        api.getProjects(user.id).catch(() => []),
        api.getCertificateTemplates().catch(() => []),
        api.getMastersForApprentice(user.id).catch(() => []),
        api.getAllCertificateUnlockRules().catch(() => []),
        api.getCertificateUnlockHistory(user.id).catch(() => [])
      ]);

      // 2. Prepare Calculation Context
      // Filter stats by master if a specific master is selected in UI context
      let relevantWorkHours = hours;
      let relevantProjects = projs;

      if (selectedMasterId) {
        relevantWorkHours = hours.filter((h: any) => String(h.master_id) === String(selectedMasterId));
        relevantProjects = projs.filter((p: any) => String(p.master_id) === String(selectedMasterId));
      }

      const stats = {
        workHours: relevantWorkHours
          .filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description))
          .reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0),
        studyHours: relevantWorkHours
          .filter((h: any) => h.description && /studium|study/i.test(h.description))
          .reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0),
        totalHours: 0,
        projectCount: relevantProjects?.length || 0
      };
      stats.totalHours = stats.workHours + stats.studyHours;

      // 3. Process All Templates
      let uCount = 0;
      let tPoints = 0;

      const processed: BadgeDisplayData[] = await Promise.all(templates.map(async (tmpl: any) => {
        // Find DB records for this template
        const relevantDBRecords = dbCerts.filter((c: any) => String(c.template_id) === String(tmpl.id));
        const tmplRules = allRules.filter((r: any) => r.template_id === tmpl.id);

        const result = calculateBadgeStatus(tmpl, {
          role: "Učedník",
          userStats: stats,
          dbRecords: relevantDBRecords,
          rules: tmplRules,
          allUsers: allUsers,
          currentMasterId: selectedMasterId ? String(selectedMasterId) : undefined,
          unlockHistory: history
        });

        // SMART ATTRIBUTION FIX (Apprentice View):
        // If met globally but calculator gave "+" (no specific attribution in DB/context),
        // check if any single master stats satisfy the condition.

        // DEBUG BEFORE CHECK
        if (tmpl.title.includes("Student 21") || tmpl.title.includes("50 hodin")) {
          console.log(`🔍 APPRENTICE PRE-CHECK ${tmpl.title}:`, {
            isLocked: result.isLocked,
            initials: result.initials,
            hasPlus: result.initials.includes("+"),
            selectedMasterId
          });
        }

        // Check if any single master stats satisfy the condition.
        // We do this even if selectedMasterId is present, because sometimes the calculator might return "+"
        // if the DB record lacks attribution or if it thinks it's a global achievement.
        if (!result.isLocked && result.initials.includes("+")) {
          const tmplWorkH = hours; // Full Raw Data
          const tmplProjs = projs;

          const involvedMasterIds = [...new Set([
            ...tmplWorkH.map((h: any) => h.master_id),
            ...tmplProjs.map((p: any) => p.master_id)
          ])].filter(Boolean);

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

            const mResult = calculateBadgeStatus(tmpl, {
              role: "Mistr",
              userStats: mStats,
              dbRecords: [],
              rules: tmplRules,
              allUsers: allUsers,
              unlockHistory: history,
            } as any);

            if (!mResult.isLocked) {
              qualifyingMasterIds.push(String(mid));
            }
          });

          if (qualifyingMasterIds.length > 0) {
            // Override with qualifying masters
            const qNames = qualifyingMasterIds.map(id => {
              const u = allUsers.find((user: any) => String(user.id) === String(id));
              return u ? u.name : "Neznámý";
            });
            result.initials = qualifyingMasterIds.map(id => {
              const u = allUsers.find((user: any) => String(user.id) === String(id));
              return getInitials(u ? u.name : "?");
            });

            // Only show "Získáno u mistra" if we are not filtering by that specific master already (redundant info)
            if (!selectedMasterId) {
              result.infoText = `Získáno u mistra: ${qNames.join(", ")}`;
            } else {
              // We are in specific master view, so just showing initials is enough, text can match rule.
              // Or we can keep it standard "Splněno".
            }
          }
        }

        // DB Sync (Auto-Lock/Unlock handling)
        if (result.shouldUpdateDB) {
          console.log(`⚠️ DB Sync needed for ${tmpl.title}: ${result.newLockedStatus ? "LOCK" : "UNLOCK"}`);
          if (result.newLockedStatus) {
            await api.lockCertificateForUser(user.id, tmpl.id).catch(e => console.error(e));
          } else {
            await api.unlockCertificateForUser(user.id, tmpl.id).catch(e => console.error(e));
          }
        }

        if (!result.isLocked) {
          uCount++;
          tPoints += result.points;
        }

        return result;
      }));

      // Sort: ID asc
      // Sort by ID (Robust)
      processed.sort((a, b) => {
        const idA = parseInt(a.templateId);
        const idB = parseInt(b.templateId);
        if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
        return String(a.templateId).localeCompare(String(b.templateId));
      });

      setDisplayItems(processed);
      setUnlockedCount(uCount);
      setTotalCount(processed.length);
      setTotalPoints(tPoints);

    } catch (e) {
      console.error("❌ Failed to load badges:", e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadAndCalculateData();
    }, [user?.id, userData.selectedMasterId, allUsers.length])
  );

  // Filter View
  const typeFilter = showBadges ? "Odznak" : "Certifikát";
  const filteredItems = displayItems.filter(i => i.category === typeFilter);
  const filteredUnlocked = filteredItems.filter(i => !i.isLocked).length;



  const BadgeModal = () => {
    if (!selectedBadge) return null;
    const item = selectedBadge;
    const isGray = item.iconColor === "gray";
    const primaryColor = item.category === "Odznak" ? theme.primary : theme.secondary;
    const displayColor = isGray ? theme.textSecondary : primaryColor;

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
                borderColor: displayColor,
              },
            ]}
          >
            <View style={[styles.modalIconContainer, { backgroundColor: displayColor + "20" }]}>
              <Feather name={isGray ? "lock" : (item.category === "Odznak" ? "award" : "file-text")} size={48} color={displayColor} />
            </View>

            <ThemedText style={[styles.modalTitle, { color: displayColor, fontWeight: "700" }]}>
              {item.headerTitle}
            </ThemedText>

            <ThemedText style={[styles.modalCategory, { color: theme.textSecondary }]}>
              {item.category}
            </ThemedText>

            <View style={[styles.masterNameBox, { width: "100%", alignItems: 'center' }]}>
              <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary }]}>
                Učedník: <ThemedText style={{ color: theme.text, fontWeight: '700' }}>Já</ThemedText>
              </ThemedText>
            </View>

            {/* Info / Context Text */}
            <View style={[styles.masterNameBox, { marginTop: Spacing.sm }]}>
              <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary, textAlign: 'center' }]}>
                {item.infoText.split(": ")[0]}:{"\n"}
                <ThemedText style={{ color: displayColor, fontWeight: '600' }}>
                  {item.infoText.split(": ")[1] || ""}
                </ThemedText>
              </ThemedText>
            </View>

            {/* Rule Box - ALWAYS SHOWN */}
            <View style={[styles.requirementBox, { backgroundColor: theme.backgroundRoot, borderColor: displayColor }]}>
              <ThemedText style={[styles.requirementLabel, { color: theme.textSecondary }]}>
                Podmínky pro získání:
              </ThemedText>
              <ThemedText style={[styles.requirementText, { color: theme.text }]}>
                {item.ruleText}
              </ThemedText>
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <View style={styles.pointsRow}>
                <Feather name="zap" size={16} color={displayColor} />
                <ThemedText style={[styles.pointsValue, { color: displayColor, fontWeight: "700" }]}>
                  {item.points} bodů
                </ThemedText>
              </View>
              {!item.isLocked && (
                <ThemedText style={[styles.unlockedLabel, { color: theme.success }]}>
                  ✓ Odemčeno
                </ThemedText>
              )}
            </View>

            <Pressable
              onPress={() => setSelectedBadge(null)}
              style={[styles.closeButton, { backgroundColor: displayColor }]}
            >
              <ThemedText style={styles.closeButtonText}>Zavřít</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: Spacing.xl + 8,
            paddingBottom: insets.bottom + Spacing.xl + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.pointsIcon, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={28} color="#FFFFFF" />
            </View>
            <View>
              <ThemedText style={styles.pointsLabel}>Celkem bodů</ThemedText>
              <ThemedText style={[styles.pointsValue, { color: theme.primary }]}>
                {totalPoints}
              </ThemedText>
            </View>
          </View>
          <View style={styles.badgeCount}>
            <ThemedText style={[styles.badgeCountText, { color: theme.textSecondary }]}>
              {unlockedCount} / {displayItems.length}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.toggleContainer, { paddingHorizontal: Spacing.lg }]}>
          <Pressable
            onPress={() => setShowBadges(true)}
            style={[
              styles.toggleButton,
              {
                backgroundColor: showBadges ? theme.primary : theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={[styles.toggleText, { color: showBadges ? "#FFFFFF" : theme.text, fontWeight: "600" }]}>
              Odznaky
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setShowBadges(false)}
            style={[
              styles.toggleButton,
              {
                backgroundColor: !showBadges ? theme.primary : theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={[styles.toggleText, { color: !showBadges ? "#FFFFFF" : theme.text, fontWeight: "600" }]}>
              Certifikáty
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText style={[styles.sectionTitle, { color: theme.text, marginHorizontal: Spacing.lg }]}>
          {typeFilter} ({filteredUnlocked} / {filteredItems.length})
        </ThemedText>

        <View style={[styles.badgesGrid, { paddingHorizontal: Spacing.lg }]}>
          {filteredItems.map((item) => (
            <View key={item.templateId} style={{ width: "48%", marginBottom: Spacing.md }}>
              <AchievementBadge
                item={item}
                onPress={() => setSelectedBadge(item)}
              // Removing scale prop as we handle width in parent container
              />
            </View>
          ))}
        </View>

        <BadgeModal />
      </ScrollView>

      {user?.role === "Učedník" && (
        <Pressable
          onPress={() => {
            console.log("🔄 Manual reload triggered");
            loadAndCalculateData();
          }}
          style={({ pressed }) => [
            styles.floatingReloadButton,
            {
              backgroundColor: theme.primary,
              opacity: pressed ? 0.7 : 1,
              bottom: insets.bottom - 10,
            }
          ]}
        >
          <Feather name="refresh-cw" size={24} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  toggleText: {
    ...Typography.body,
    fontSize: 14,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pointsIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  pointsLabel: {
    ...Typography.body,
    fontSize: 12,
  },
  pointsValue: {
    ...Typography.title,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  badgeCount: {
    alignItems: "center",
  },
  badgeCountText: {
    ...Typography.body,
    fontSize: 14,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  badgeCard: {
    width: "48%",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  badgeTitle: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  badgeCategory: {
    ...Typography.small,
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  badgePoints: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  pointsText: {
    ...Typography.small,
    fontWeight: "600",
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
    ...Typography.h4,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  modalCategory: {
    ...Typography.small,
    marginBottom: Spacing.lg,
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
    fontSize: 14,
    lineHeight: 22,
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
  floatingReloadButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
