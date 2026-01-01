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

// ... existing imports

export default function DashboardScreen() {
  const { theme } = useTheme();
  const insets = useScreenInsets({ hasTransparentHeader: false });
  const navigation = useNavigation();
  const { user } = useAuth();
  const { userData, adminSettings, getRecentProjects, getTotalHours, getAllBadgesAndCertificates, refreshData, allUsers } = useData();
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
  const [allCertificates, setAllCertificates] = useState<any[]>([]);
  const [userLimits, setUserLimits] = useState<AdminSettings | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadMasterApprenticeData = async () => {
        if (user?.role === "Mistr") {
          const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
          if (data) {
            const parsed = JSON.parse(data);
            setSelectedApprenticeData(parsed);

            // Načti všechny šablony certifikátů
            const templates = await api.getCertificateTemplates().catch(() => []);
            let allCerts = templates.map((t: any) => ({ ...t, locked: true }));

            // Kontroluj pravidla pro vybraného učedníka
            const apprenticeId = parsed.id || parsed.apprenticeId;
            if (apprenticeId) {
              const dbCertificates = await api.getCertificates(apprenticeId).catch(() => []);
              const workHours = await api.getWorkHours(apprenticeId).catch(() => []);
              const projects = await api.getProjects(apprenticeId).catch(() => []);

              // Count only WORK hours (not study)
              const totalWorkHours = workHours
                .filter((h: any) => h.description && h.description.includes("Práce"))
                .reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);
              const totalStudyHours = workHours
                .filter((h: any) => h.description && h.description.includes("Studium"))
                .reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);
              const totalAllHours = totalWorkHours + totalStudyHours;

              const totalProjects = projects?.length || 0;

              allCerts = await Promise.all(
                allCerts.map(async (certTemplate: any) => {
                  // 1. Zkus najít existující záznam v DB
                  const existingCert = dbCertificates.find((c: any) => c.title === certTemplate.title);

                  // Pokud je odemčen v DB, respektuj to
                  if (existingCert && !existingCert.locked) {
                    return { ...certTemplate, ...existingCert, locked: false };
                  }

                  const rules = await api.getCertificateUnlockRules(certTemplate.id).catch(() => []);
                  let isUnlocked = false;

                  if (rules.length === 0) {
                    isUnlocked = false;
                  } else {
                    const automaticRules = rules.filter((r: any) => r.rule_type !== "MANUAL");

                    if (automaticRules.length === 0) {
                      isUnlocked = false;
                    } else {
                      isUnlocked = automaticRules.every((rule: any) => {
                        if (rule.condition_type === "NONE") return true;

                        if (rule.condition_type === "WORK_HOURS") {
                          return totalWorkHours >= rule.condition_value;
                        } else if (rule.condition_type === "STUDY_HOURS") {
                          return totalStudyHours >= rule.condition_value;
                        } else if (rule.condition_type === "TOTAL_HOURS") {
                          return totalAllHours >= rule.condition_value;
                        } else if (rule.condition_type === "PROJECTS") {
                          return totalProjects >= rule.condition_value;
                        }
                        return false;
                      });
                    }
                  }
                  return { ...certTemplate, ...existingCert, locked: !isUnlocked };
                })
              );
            }

            setAllCertificates(allCerts);
          } else {
            // Master has NO data selected
            setSelectedApprenticeData(null);
          }
        } else {
          // Pro učedníka - obnov data při focusu
          refreshData?.();
        }
      };
      loadMasterApprenticeData();
    }, [user?.role])
  );

  useEffect(() => {
    const loadUserLimits = async () => {
      const userId = user?.role === "Mistr" && selectedApprenticeData
        ? selectedApprenticeData.id
        : user?.id;
      if (!userId) return;

      try {
        const limits = await api.getUserHourLimits(userId);
        setUserLimits(limits ?? null);
      } catch (error) {
        console.error("Chyba pri nacitani limitu:", error);
      }
    };
    loadUserLimits();
  }, [user?.id, user?.role, selectedApprenticeData?.id]);

  // Pokud je mistr a nemá vybraného učedníka -> BLOCK
  if (user?.role === "Mistr" && !selectedApprenticeData) {
    return <NoApprenticeSelected />;
  }

  // Pokud je mistr a má vybraného učedníka, zobraz jeho data
  const displayData = user?.role === "Mistr" && selectedApprenticeData ? selectedApprenticeData : userData;
  const displayApprenticeData = user?.role === "Mistr" && selectedApprenticeData ? selectedApprenticeData : null;

  const allBadges = displayApprenticeData ? (allCertificates.length > 0 ? allCertificates : displayApprenticeData.certificates) : getAllBadgesAndCertificates();

  const activeBadges = allBadges
    .filter((item: any) => !item.locked && item.category === "Badge")
    .sort((a: any, b: any) => (a.id || 0) - (b.id || 0));

  const activeCertificates = allBadges
    .filter((item: any) => !item.locked && item.category === "Certifikát")
    .sort((a: any, b: any) => (a.id || 0) - (b.id || 0));

  const recentProjects = displayApprenticeData
    ? (displayApprenticeData.projects || []).slice(0, 3)
    : getRecentProjects().filter((p: any) => !userData.selectedMasterId || p.master_id === userData.selectedMasterId);

  // Filter total hours by selected master
  const totalHours = displayApprenticeData
    ? displayApprenticeData.totalHours
    : userData.workHours
      .filter((h: any) => !userData.selectedMasterId || h.master_id === userData.selectedMasterId)
      .reduce((sum: number, h: any) => sum + (h.hours || 0), 0);

  const badgeColor = selectedBadge?.category === "Badge" ? theme.primary : theme.secondary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingTop: 38, paddingBottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >


      <View style={styles.statsContainer}>
        <StatCard icon="clock" label="Celkem hodin" value={`${totalHours}h`} color={theme.primary} />
        <View style={{ width: Spacing.md }} />
        <StatCard icon="folder" label="Projekty" value={String(displayApprenticeData ? displayApprenticeData.projectCount : userData.projects.length)} color={theme.secondary} />
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
        <GoalProgressBox
          userId={displayApprenticeData?.id}
          userLimits={userLimits}
          workHours={displayApprenticeData?.workHours}
        />
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Poslední projekty</ThemedText>
        <Pressable onPress={() => navigation.navigate("Projects" as never)}>
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
            onPress={() => (navigation.navigate as any)("ProjectDetail", { project, projectIndex: userData.projects.indexOf(project) })}
            masterComment={project.master_comment}
            isLiked={project.is_liked}
            masterInitials={project.master_id ? getInitials(allUsers.find(u => u.id === project.master_id)?.name || "") : undefined}
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Odznaky</ThemedText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.achievementsScroll}
      >
        {activeBadges.length > 0 ? (
          activeBadges.map((badge: any) => (
            <Pressable
              key={badge.id}
              onPress={() => setSelectedBadge(badge)}
              style={styles.badgeWrapper}
            >
              <View
                style={[
                  styles.badgeCard,
                  {
                    backgroundColor: theme.primary + "20",
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Feather
                  name="award"
                  size={32}
                  color={theme.primary}
                />
                <ThemedText style={[styles.badgeTitle, { color: theme.text, marginTop: Spacing.sm }]}>
                  {badge.title}
                </ThemedText>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={{ paddingLeft: Spacing.lg }}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Zatím žádné odznaky
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Certifikáty</ThemedText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.achievementsScroll}
      >
        {activeCertificates.length > 0 ? (
          activeCertificates.map((cert: any) => (
            <Pressable
              key={cert.id}
              onPress={() => setSelectedBadge(cert)}
              style={styles.badgeWrapper}
            >
              <View
                style={[
                  styles.badgeCard,
                  {
                    backgroundColor: theme.secondary + "20",
                    borderColor: theme.secondary,
                  },
                ]}
              >
                <Feather
                  name="award"
                  size={32}
                  color={theme.secondary}
                />
                <ThemedText style={[styles.badgeTitle, { color: theme.text, marginTop: Spacing.sm }]}>
                  {cert.title}
                </ThemedText>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={{ paddingLeft: Spacing.lg }}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Zatím žádné certifikáty
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {selectedBadge && (
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
                  borderColor: badgeColor,
                },
              ]}
            >
              <View
                style={[
                  styles.modalIconContainer,
                  {
                    backgroundColor: badgeColor + "20",
                  },
                ]}
              >
                <Feather name="award" size={48} color={badgeColor} />
              </View>

              <ThemedText style={[styles.modalTitle, { color: badgeColor, fontWeight: "700" }]}>
                {selectedBadge.title}
              </ThemedText>

              <ThemedText style={[styles.modalCategory, { color: theme.textSecondary }]}>
                {selectedBadge.category}
              </ThemedText>

              <View style={styles.modalFooter}>
                <View style={styles.pointsRow}>
                  <Feather name="zap" size={16} color={badgeColor} />
                  <ThemedText style={[styles.pointsValue, { color: badgeColor, fontWeight: "700" }]}>
                    {selectedBadge.points} bodů
                  </ThemedText>
                </View>
                <ThemedText style={[styles.unlockedLabel, { color: badgeColor }]}>
                  ✓ Odemčeno
                </ThemedText>
              </View>

              <Pressable
                onPress={() => setSelectedBadge(null)}
                style={[styles.closeButton, { backgroundColor: badgeColor }]}
              >
                <ThemedText style={[styles.closeButtonText]}>Zavřít</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

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
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
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
  goalItem: {
    marginBottom: Spacing.lg,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  goalLabel: {
    ...Typography.body,
    fontWeight: "600",
  },
  goalPercentage: {
    ...Typography.body,
    fontWeight: "700",
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  goalCounter: {
    ...Typography.small,
  },
  achievementsScroll: {
    paddingLeft: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  badgeWrapper: {
    marginRight: Spacing.md,
  },
  badgeCard: {
    width: 100,
    height: 120,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: {
    ...Typography.small,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
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
