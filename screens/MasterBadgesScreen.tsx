import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useMaster } from "@/contexts/MasterContext";
import { useData } from "@/contexts/DataContext";
import { NoApprenticeSelected } from "@/components/NoApprenticeSelected";
import { calculateBadgeStatus, BadgeDisplayData } from "@/services/BadgeCalculator";
import { getInitials } from "@/utils/string";

export default function MasterBadgesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useScreenInsets();
  const { selectedApprenticeId, apprentices } = useMaster();
  const { allUsers } = useData();

  const [showBadges, setShowBadges] = useState(true);
  const [displayItems, setDisplayItems] = useState<BadgeDisplayData[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDisplayData | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const [statsSummary, setStatsSummary] = useState({ work: 0, study: 0, projects: 0 });

  const loadData = async () => {
    try {
      if (!user?.id) return;
      const currentMasterId = user.id;

      if (!selectedApprenticeId) {
        // Aggregation Mode
        try {
          const apps = await api.getApprenticesForMaster(currentMasterId);
          const appIds = apps.map((a: any) => a.apprenticeId);
          const certsPromises = appIds.map((id: string) => api.getCertificates(id).catch(() => []));
          const certsResults = await Promise.all(certsPromises);
          const allTeamCerts = certsResults.flat();

          const templates = await api.getAllCertificateTemplates();

          const projs = await api.getProjectsForMaster(currentMasterId);
          const projIds = projs.map((p: any) => p.id);
          const hours = await api.getWorkHoursForProjects(projIds);

          const wSum = hours.filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);
          const sSum = hours.filter((h: any) => h.description && /studium|study/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);
          setStatsSummary({ work: wSum, study: sSum, projects: projs.length });

          const processed: BadgeDisplayData[] = templates.map((tmpl: any) => {
            const catLower = (tmpl.category || "").toLowerCase();
            const isBadge = catLower.includes("badge") || catLower.includes("odznak");
            const type = isBadge ? "Odznak" : "Certifikát";

            const earners = allTeamCerts.filter((c: any) => String(c.template_id) === String(tmpl.id) && !c.locked);

            const uniqueUserIds = [...new Set(earners.map((c: any) => c.user_id))];
            const earnerObjs = uniqueUserIds.map(uid => apps.find((a: any) => a.apprenticeId === uid)).filter(Boolean);
            const initials = earnerObjs.map((a: any) => getInitials(a.apprenticeName));
            const names = earnerObjs.map((a: any) => a.apprenticeName);
            const hasEarners = names.length > 0;

            return {
              templateId: String(tmpl.id),
              title: `${tmpl.title} ${type}`,
              category: type as any,
              points: tmpl.points,
              isLocked: !hasEarners,
              iconColor: hasEarners ? "colored" : "gray",
              initials: initials,
              earnedByNames: names,
              headerTitle: tmpl.title,
              infoText: hasEarners ? `Získalo: ${names.length} učedníků` : "Nikdo nemá",
              ruleText: type === 'Odznak' ? "Dle pravidel" : "Uděluje mistr",
              actionType: "NONE",
              shouldUpdateDB: false
            };
          });

          processed.sort((a, b) => (parseInt(a.templateId) || 0) - (parseInt(b.templateId) || 0));
          setDisplayItems(processed);
        } catch (e) {
          console.error("Aggregation error in MasterBadges:", e);
        }
        return;
      }

      // 1. Load Data
      const [workHours, projects, templates, dbCerts, allRules, history] = await Promise.all([
        api.getWorkHours(selectedApprenticeId).catch(() => []),
        api.getProjects(selectedApprenticeId).catch(() => []),
        api.getCertificateTemplates().catch(() => []),
        api.getCertificates(selectedApprenticeId).catch(() => []),
        api.getAllCertificateUnlockRules().catch(() => []),
        api.getCertificateUnlockHistory(selectedApprenticeId).catch(() => [])
      ]);

      // 2. Prepare Context (Filter stats for THIS Master)
      const myHours = workHours.filter((h: any) => String(h.master_id) === String(currentMasterId));
      const myProjects = projects.filter((p: any) => String(p.master_id) === String(currentMasterId));

      let workH = 0;
      let studyH = 0;
      myHours.forEach((h: any) => {
        const val = typeof h.hours === 'number' ? h.hours : parseFloat(h.hours);
        if (isNaN(val)) return;
        const desc = h.description || "";
        if (desc.includes("Studium")) studyH += val;
        else workH += val;
      });

      const stats = {
        workHours: workH,
        studyHours: studyH,
        totalHours: workH + studyH,
        projectCount: myProjects.length
      };
      setStatsSummary({ work: workH, study: studyH, projects: myProjects.length });

      // 3. Process Templates
      const processed: BadgeDisplayData[] = templates.map((tmpl: any) => {
        // Filter DB records relevant for THIS Master (if Certificates) or Apprentice (if Badges)
        // Calc Context expects 'dbRecords' to be available.
        // For Badge: We check if apprentice has it (from anyone? No, Master view -> Is it met HERE?)
        // BadgeCalc handles "Master View" logic if role is Mistr.

        const relevantRecords = dbCerts.filter((c: any) => String(c.template_id) === String(tmpl.id));
        const tmplRules = allRules.filter((r: any) => r.template_id === tmpl.id);

        return calculateBadgeStatus(tmpl, {
          role: "Mistr",
          userStats: stats,
          dbRecords: relevantRecords,
          rules: tmplRules,
          allUsers: allUsers,
          currentMasterId: currentMasterId,
          unlockHistory: history,
          targetUserId: selectedApprenticeId
        });
      });

      processed.sort((a, b) => (parseInt(a.templateId) || 0) - (parseInt(b.templateId) || 0));
      setDisplayItems(processed);

    } catch (error) {
      console.error("❌ Error loading master badges:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [selectedApprenticeId, user?.id])
  );

  // Handlers for Activate/Deactivate
  const handleToggleStatus = async (action: "ACTIVATE" | "DEACTIVATE") => {
    if (!selectedBadge || !selectedApprenticeId || !user?.id) return;
    setIsActivating(true);
    try {
      if (action === "ACTIVATE") {
        await api.unlockCertificateForUser(selectedApprenticeId, parseInt(selectedBadge.templateId), String(user.id));
      } else {
        await api.lockCertificateForUser(selectedApprenticeId, parseInt(selectedBadge.templateId));
      }
      await loadData(); // Reload to refresh
      setSelectedBadge(null);
    } catch (e) {
      console.error("Error toggling cert:", e);
      alert("Chyba při změně stavu.");
    }
    setIsActivating(false);
  };

  // Render Logic


  const typeFilter = showBadges ? "Odznak" : "Certifikát";
  const filteredItems = displayItems.filter(i => i.category === typeFilter);
  const filteredUnlocked = filteredItems.filter(i => !i.isLocked).length;

  const BadgeItem = ({ item }: { item: BadgeDisplayData }) => {
    const isGray = item.iconColor === "gray";
    const primaryColor = item.category === "Odznak" ? theme.primary : theme.secondary;
    const cardBorderColor = isGray ? theme.border : primaryColor;
    const iconBgColor = isGray ? theme.backgroundRoot : primaryColor + "20";
    const iconColor = isGray ? theme.textSecondary : primaryColor;

    return (
      <Pressable
        onPress={() => setSelectedBadge(item)}
        style={({ pressed }) => [
          styles.badgeCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: cardBorderColor,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {item.initials.length > 0 && !item.isLocked && (
          <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.sm }}>
            {item.initials.map((init, idx) => (
              <View key={idx} style={[styles.miniBadge, { borderColor: primaryColor, backgroundColor: theme.backgroundDefault }]}>
                <ThemedText style={[styles.miniBadgeText, { color: primaryColor }]}>{init}</ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.badgeIcon, { backgroundColor: iconBgColor }]}>
          <Feather
            name={isGray ? "lock" : (item.category === "Odznak" ? "award" : "file-text")}
            size={32}
            color={iconColor}
          />
        </View>

        <ThemedText style={[styles.badgeTitle, { fontWeight: "600", color: isGray ? theme.textSecondary : theme.text }]}>
          {item.headerTitle}
        </ThemedText>

        <ThemedText style={[styles.badgeCategory, { color: theme.textSecondary }]}>
          {item.category}
        </ThemedText>

        <View style={styles.badgePoints}>
          <Feather name="zap" size={14} color={isGray ? theme.border : primaryColor} />
          <ThemedText style={[styles.pointsText, { color: isGray ? theme.border : primaryColor }]}>
            {item.points}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  const BadgeModal = () => {
    if (!selectedBadge) return null;
    const item = selectedBadge;
    const isGray = item.iconColor === "gray";
    const primaryColor = item.category === "Odznak" ? theme.primary : theme.secondary;
    const displayColor = isGray ? theme.textSecondary : primaryColor;

    // Resolve apprentice name
    const appName = apprentices.find(a => a.apprenticeId === selectedApprenticeId)?.apprenticeName || "Učedník";

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
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, borderColor: displayColor }]}
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
              {item.earnedByNames && item.earnedByNames.length > 0 ? (
                <View>
                  <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary, textAlign: 'center' }]}>Získali:</ThemedText>
                  {item.earnedByNames.map((n, idx) => (
                    <ThemedText key={idx} style={{ color: theme.text, fontWeight: '700', textAlign: 'center' }}>{n}</ThemedText>
                  ))}
                </View>
              ) : (
                <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary }]}>
                  Učedník: <ThemedText style={{ color: theme.text, fontWeight: '700' }}>{appName}</ThemedText>
                </ThemedText>
              )}
            </View>

            <View style={[styles.masterNameBox, { marginTop: Spacing.sm }]}>
              <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary, textAlign: 'center' }]}>
                {item.infoText.split(": ")[0]}:{"\n"}
                <ThemedText style={{ color: displayColor, fontWeight: '600' }}>
                  {item.infoText.split(": ")[1] || ""}
                </ThemedText>
              </ThemedText>
            </View>

            <View style={[styles.requirementBox, { backgroundColor: theme.backgroundRoot, borderColor: displayColor }]}>
              <ThemedText style={[styles.requirementLabel, { color: theme.textSecondary }]}>
                Podmínky pro získání:
              </ThemedText>
              <ThemedText style={[styles.requirementText, { color: theme.text }]}>
                {item.ruleText}
              </ThemedText>
            </View>

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

            {/* ACTION BUTTONS (Certificate Only) */}
            {item.actionType !== "NONE" && (
              <Pressable
                onPress={() => handleToggleStatus(item.actionType as any)}
                disabled={isActivating}
                style={[styles.closeButton, {
                  backgroundColor: item.actionType === "ACTIVATE" ? theme.success : theme.error,
                  marginBottom: Spacing.md,
                  opacity: isActivating ? 0.6 : 1
                }]}
              >
                <ThemedText style={styles.closeButtonText}>
                  {isActivating ? "Pracuji..." : (item.actionType === "ACTIVATE" ? "AKTIVOVAT" : "DEAKTIVOVAT")}
                </ThemedText>
              </Pressable>
            )}

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
            paddingTop: insets.top + Spacing.xl,
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
              <ThemedText style={styles.pointsLabel}>Bodů u vás</ThemedText>
              <ThemedText style={[styles.pointsValue, { color: theme.primary }]}>
                {displayItems.filter(i => !i.isLocked).reduce((s, i) => s + i.points, 0)}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.statsRow, { paddingHorizontal: Spacing.lg }]}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>{statsSummary.work.toFixed(1)}h</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Práce</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: theme.secondary }]}>{statsSummary.study.toFixed(1)}h</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Studium</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: theme.text }]}>{statsSummary.projects}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Projekty</ThemedText>
          </View>
        </View>

        <View style={[styles.toggleContainer, { paddingHorizontal: Spacing.lg }]}>
          <Pressable
            onPress={() => setShowBadges(true)}
            style={[styles.toggleButton, { backgroundColor: showBadges ? theme.primary : theme.backgroundDefault, borderColor: theme.border }]}
          >
            <ThemedText style={[styles.toggleText, { color: showBadges ? "#FFFFFF" : theme.text, fontWeight: "600" }]}>Odznaky</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setShowBadges(false)}
            style={[styles.toggleButton, { backgroundColor: !showBadges ? theme.primary : theme.backgroundDefault, borderColor: theme.border }]}
          >
            <ThemedText style={[styles.toggleText, { color: !showBadges ? "#FFFFFF" : theme.text, fontWeight: "600" }]}>Certifikáty</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={[styles.sectionTitle, { color: theme.text, marginHorizontal: Spacing.lg }]}>
          {typeFilter} ({filteredUnlocked} / {filteredItems.length})
        </ThemedText>

        <View style={[styles.badgesGrid, { paddingHorizontal: Spacing.lg }]}>
          {filteredItems.map((item) => (
            <BadgeItem key={item.templateId} item={item} />
          ))}
        </View>

        <BadgeModal />
      </ScrollView>

      <Pressable
        onPress={() => { loadData(); }}
        style={({ pressed }) => [styles.floatingReloadButton, { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1, bottom: insets.bottom - 10 }]}
      >
        <Feather name="refresh-cw" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 0 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, padding: Spacing.lg,
    borderRadius: BorderRadius.sm, borderWidth: 1,
  },
  toggleContainer: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  toggleButton: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: "center" },
  toggleText: { ...Typography.body, fontSize: 14 },
  headerContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  pointsIcon: { width: 52, height: 52, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center", marginRight: Spacing.md },
  pointsLabel: { ...Typography.body, fontSize: 12 },
  pointsValue: { ...Typography.title, fontWeight: "700", marginTop: Spacing.xs },
  badgeCount: { alignItems: "center" },
  badgeCountText: { ...Typography.body, fontSize: 14 },
  sectionTitle: { ...Typography.h4, marginBottom: Spacing.md },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeCard: { width: "48%", borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md, alignItems: "center", borderWidth: 1 },
  badgeIcon: { width: 60, height: 60, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  badgeTitle: { ...Typography.body, textAlign: "center", marginBottom: Spacing.xs },
  badgeCategory: { ...Typography.small, fontSize: 12, marginBottom: Spacing.xs },
  badgePoints: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  pointsText: { ...Typography.small, fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: BorderRadius.md, padding: Spacing.lg, width: "85%", borderWidth: 2, alignItems: "center" },
  modalIconContainer: { width: 80, height: 80, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h4, marginBottom: Spacing.sm, textAlign: "center" },
  modalCategory: { ...Typography.small, marginBottom: Spacing.lg },
  requirementBox: { borderRadius: BorderRadius.sm, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.lg, width: "100%" },
  requirementLabel: { ...Typography.small, fontWeight: "600", marginBottom: Spacing.sm },
  requirementText: { ...Typography.body, lineHeight: 22 },
  miniBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  miniBadgeText: { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  masterNameBox: { marginBottom: Spacing.md },
  masterNameLabel: { ...Typography.small },
  modalFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: Spacing.lg },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  unlockedLabel: { ...Typography.small, fontWeight: "700" },
  closeButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, width: "100%", alignItems: "center" },
  closeButtonText: { ...Typography.body, fontWeight: "700", color: "#FFFFFF" },
  floatingReloadButton: { position: 'absolute', left: '50%', marginLeft: -28, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.lg },
  statItem: { alignItems: "center" },
  statValue: { ...Typography.h4, fontWeight: "700" },
  statLabel: { ...Typography.small, fontSize: 12 },
});
