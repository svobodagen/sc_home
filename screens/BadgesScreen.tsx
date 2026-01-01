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

export default function BadgesScreen() {
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const { getAllBadgesAndCertificates } = useData();
  const [showBadges, setShowBadges] = useState(true);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
  const [apprenticeCerts, setApprentiecCerts] = useState<any[]>([]);
  const [unlockedCertsCount, setUnlockedCertsCount] = useState(0);

  const calculateCertificatesForApprentice = async (userId: string) => {
    try {
      console.log("📊 calculateCertificatesForApprentice spuštěn pro userId:", userId);

      // Načti všechny šablony certifikátů místo jen přidělených
      const certificateTemplates = await api.getCertificateTemplates().catch(() => []);
      const workHours = await api.getWorkHours(userId).catch(() => []);
      const projects = await api.getProjects(userId).catch(() => []);

      // Count only WORK hours (not study)
      const totalWorkHours = workHours
        .filter((h: any) => h.description && h.description.includes("Práce"))
        .reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);

      const totalStudyHours = workHours
        .filter((h: any) => h.description && h.description.includes("Studium"))
        .reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);

      const totalAllHours = totalWorkHours + totalStudyHours;

      const totalProjects = projects?.length || 0;

      let unlockedCount = 0;
      // Načti SKUTEČNÉ certifikáty z DB (včetně stavu locked/unlocked)
      const dbCertificates = await api.getCertificates(userId).catch(() => []);
      console.log("📥 BadgesScreen - DB certifikáty:", dbCertificates.length);

      const certsWithRules = await Promise.all(
        certificateTemplates.map(async (certTemplate: any) => {
          // 1. Zkus najít existující záznam v DB
          const existingCert = dbCertificates.find((c: any) => c.title === certTemplate.title);

          let shouldBeUnlocked = false;
          let hasManualRule = false;
          let requirementText = "Splnění kritérií";

          if (existingCert && !existingCert.locked) {
            shouldBeUnlocked = true; // Respektuj DB stav
            console.log(`✅ Certifikát "${certTemplate.title}" odemčen dle DB.`);
          }

          const rules = await api.getCertificateUnlockRules(certTemplate.id).catch(() => []);


          if (rules.length === 0) {
            requirementText = "Bez kritérií (zamčeno)";
            if (!shouldBeUnlocked) shouldBeUnlocked = false;
          } else {
            const descriptions: string[] = [];
            const automaticRules = rules.filter((r: any) => r.rule_type !== "MANUAL");

            // Build description text
            for (const rule of rules) {
              if (rule.rule_type === "MANUAL") {
                descriptions.push("Odemknutí mistrem");
                hasManualRule = true;
              } else if (rule.condition_type === "WORK_HOURS") {
                descriptions.push(`Odpracuj ${rule.condition_value} hodin`);
              } else if (rule.condition_type === "STUDY_HOURS") {
                descriptions.push(`Nastuduj ${rule.condition_value} hodin`);
              } else if (rule.condition_type === "TOTAL_HOURS") {
                descriptions.push(`Celkem ${rule.condition_value} hodin (práce + studium)`);
              } else if (rule.condition_type === "PROJECTS") {
                descriptions.push(`Dokončeno ${rule.condition_value} projektů`);
              } else if (rule.condition_type === "NONE") {
                descriptions.push("Automaticky odemčeno");
              }
            }
            requirementText = descriptions.join(" • ");

            // Pokud ještě NENÍ odemčeno z DB, zkus spočítat automatická pravidla
            if (!shouldBeUnlocked) {
              if (automaticRules.length > 0) {
                shouldBeUnlocked = automaticRules.every((rule: any) => {
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
          }

          if (shouldBeUnlocked) unlockedCount++;
          const result = {
            ...certTemplate, // Template data base
            ...existingCert, // DB data override (id, earned_at)
            user_id: userId,
            locked: !shouldBeUnlocked,
            requirement: requirementText,
            hasManualRule
          };
          console.log(`  ✅ ${certTemplate.title}: requirement="${requirementText}", locked=${!shouldBeUnlocked}`);
          return result;
        })
      );

      console.log("📋 certsWithRules:", certsWithRules);
      setApprentiecCerts(certsWithRules);
      setUnlockedCertsCount(unlockedCount);
    } catch (error) {
      console.error("❌ Chyba při počítání certifikátů:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        console.log("🔄 useFocusEffect na BadgesScreen - role:", user?.role);
        if (user?.role === "Mistr") {
          const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
          if (data) {
            const parsed = JSON.parse(data);
            setSelectedApprenticeData(parsed);
            setAllBadges(parsed.certificates || []);
          }
        } else if (user?.role === "Učedník") {
          // Reload certifikáty s pravidly
          await calculateCertificatesForApprentice(user.id);
        }
      };
      loadData();
    }, [user?.id, user?.role])
  );

  // Použij apprenticeCerts pro Učedníka, allBadges pro Mistry
  const displayCerts = user?.role === "Učedník" ? apprenticeCerts : allBadges;
  const badges = displayCerts.filter((item) => item.category === "Badge");
  const certificates = displayCerts.filter((item) => item.category === "Certifikát");
  const displayItems = (showBadges ? badges : certificates)
    .sort((a, b) => (a.id || 0) - (b.id || 0));

  const BadgeItem = ({ cert }: any) => (
    <Pressable
      onPress={() => setSelectedBadge(cert)}
      style={({ pressed }) => [
        styles.badgeCard,
        {
          backgroundColor: cert.locked ? theme.backgroundDefault : theme.backgroundDefault,
          borderColor: cert.locked ? theme.border : theme.primary,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.badgeIcon,
          {
            backgroundColor: cert.locked ? theme.backgroundRoot : theme.primary + "20",
          },
        ]}
      >
        <Feather
          name={cert.locked ? "lock" : "award"}
          size={32}
          color={cert.locked ? theme.textSecondary : theme.primary}
        />
      </View>
      <ThemedText style={[styles.badgeTitle, { fontWeight: "600", color: cert.locked ? theme.textSecondary : theme.text }]}>
        {cert.title}
      </ThemedText>
      <ThemedText style={[styles.badgeCategory, { color: theme.textSecondary }]}>
        {cert.category}
      </ThemedText>
      {cert.hasManualRule && (
        <ThemedText style={{ fontSize: 12, color: theme.primary }}>★</ThemedText>
      )}
      <View style={styles.badgePoints}>
        <Feather name="zap" size={14} color={cert.locked ? theme.border : theme.primary} />
        <ThemedText style={[styles.pointsText, { color: cert.locked ? theme.border : theme.primary }]}>
          {cert.points}
        </ThemedText>
      </View>
    </Pressable>
  );

  const BadgeModal = () => {
    if (!selectedBadge) return null;
    const isWork = selectedBadge.category === "Badge";
    const badgeColor = isWork ? theme.primary : theme.secondary;

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
              <Feather
                name={selectedBadge.locked ? "lock" : "award"}
                size={48}
                color={badgeColor}
              />
            </View>

            <ThemedText style={[styles.modalTitle, { color: badgeColor, fontWeight: "700" }]}>
              {selectedBadge.title}
            </ThemedText>

            <ThemedText style={[styles.modalCategory, { color: theme.textSecondary }]}>
              {selectedBadge.category}
            </ThemedText>

            <View
              style={[
                styles.requirementBox,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: badgeColor,
                },
              ]}
            >
              <ThemedText style={[styles.requirementLabel, { color: theme.textSecondary }]}>
                Jak získat:
              </ThemedText>
              <ThemedText style={[styles.requirementText, { color: theme.text }]}>
                {selectedBadge.requirement || "Splnění kritérií"}
              </ThemedText>
            </View>

            <View style={styles.modalFooter}>
              <View style={styles.pointsRow}>
                <Feather name="zap" size={16} color={badgeColor} />
                <ThemedText style={[styles.pointsValue, { color: badgeColor, fontWeight: "700" }]}>
                  {selectedBadge.points} bodů
                </ThemedText>
              </View>
              {!selectedBadge.locked && (
                <ThemedText style={[styles.unlockedLabel, { color: badgeColor }]}>
                  ✓ Odemčeno
                </ThemedText>
              )}
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
    );
  };

  const unlockedItems = displayItems.filter((cert) => !cert.locked);
  const totalPoints = displayCerts.filter((cert) => !cert.locked).reduce((sum, cert) => sum + cert.points, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Spacing.xl + 8,
          paddingBottom: insets.bottom + Spacing.xl,
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
            {displayCerts.filter((c) => !c.locked).length} / {displayCerts.length}
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
          <ThemedText
            style={[
              styles.toggleText,
              { color: showBadges ? "#FFFFFF" : theme.text, fontWeight: "600" },
            ]}
          >
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
          <ThemedText
            style={[
              styles.toggleText,
              { color: !showBadges ? "#FFFFFF" : theme.text, fontWeight: "600" },
            ]}
          >
            Certifikáty
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText style={[styles.sectionTitle, { color: theme.text, marginHorizontal: Spacing.lg }]}>
        {showBadges ? "Odznaky" : "Certifikáty"} ({unlockedItems.length} / {displayItems.length})
      </ThemedText>

      <View style={[styles.badgesGrid, { paddingHorizontal: Spacing.lg }]}>
        {displayItems.map((cert, idx) => (
          <BadgeItem key={idx} cert={cert} />
        ))}
      </View>

      <BadgeModal />
    </ScrollView>
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
  badgeDate: {
    marginBottom: Spacing.sm,
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
