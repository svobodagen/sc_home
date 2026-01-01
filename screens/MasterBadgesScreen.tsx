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

import { NoApprenticeSelected } from "@/components/NoApprenticeSelected";

export default function MasterBadgesScreen() {
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const [showBadges, setShowBadges] = useState(true);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [apprenticeId, setApprenticeId] = useState<string>("");
  const [hasSelectedApprentice, setHasSelectedApprentice] = useState(true);

  const loadData = async () => {
    try {
      // Inicializuj allCerts aby nebyla nikdy undefined
      let allCerts: any[] = [];

      // Pokud máme vybraného učedníka, načti jeho SKUTEČNÉ certifikáty
      const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
      if (data) {
        setHasSelectedApprentice(true);
        const parsed = JSON.parse(data);
        // ...
        const id = parsed.id || parsed.apprenticeId;
        setApprenticeId(id);
        console.log("📋 Načítám certifikáty pro apprentice:", id);

        if (id) {
          // Načti SKUTEČNÉ certifikáty (getCertificates inicializuje pokud chybí)
          const actualCerts = await api.getCertificates(id).catch(() => []);
          console.log("📦 Počet certifikátů:", actualCerts?.length);

          // Vždy zobrazit skutečné certifikáty
          allCerts = actualCerts;

          // Načti data učedníka pro pravidla
          const workHours = await api.getWorkHours(id).catch(() => []);
          const projects = await api.getProjects(id).catch(() => []);

          const totalWorkHours = workHours
            .filter((h: any) => h.description && h.description.includes("Práce"))
            .reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);

          const totalStudyHours = workHours
            .filter((h: any) => h.description && h.description.includes("Studium"))
            .reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);

          const totalAllHours = totalWorkHours + totalStudyHours;

          const totalProjects = projects?.length || 0;

          // Pro každý certifikát zkontrolovat pravidla pro display
          allCerts = await Promise.all(
            actualCerts.map(async (cert: any) => {
              // Najdi pravidla podle title, NE podle ID
              const template = await api.getCertificateTemplates()
                .then(templates => templates.find((t: any) => t.title === cert.title))
                .catch(() => null);

              const rules = template ? await api.getCertificateUnlockRules(template.id).catch(() => []) : [];

              let requirementText = "Splnění kritérií";
              let hasManualRule = false;
              let shouldBeUnlocked = cert.locked === false; // Věří DB

              if (rules.length === 0) {
                requirementText = "Bez kritérií";
              } else {
                const descriptions: string[] = [];
                for (const rule of rules) {
                  if (rule.rule_type === "MANUAL") {
                    descriptions.push("Odemknutí mistrem");
                    hasManualRule = true;
                  } else if (rule.condition_type === "WORK_HOURS") {
                    descriptions.push(`Odpracuj ${rule.condition_value} hodin`);
                    if (totalWorkHours >= rule.condition_value) shouldBeUnlocked = true;
                  } else if (rule.condition_type === "STUDY_HOURS") {
                    descriptions.push(`Nastuduj ${rule.condition_value} hodin`);
                    if (totalStudyHours >= rule.condition_value) shouldBeUnlocked = true;
                  } else if (rule.condition_type === "TOTAL_HOURS") {
                    descriptions.push(`Celkem ${rule.condition_value} hodin (práce + studium)`);
                    if (totalAllHours >= rule.condition_value) shouldBeUnlocked = true;
                  } else if (rule.condition_type === "PROJECTS") {
                    descriptions.push(`Dokončeno ${rule.condition_value} projektů`);
                    if (totalProjects >= rule.condition_value) shouldBeUnlocked = true;
                  }
                }
                requirementText = descriptions.join(" • ");
              }

              const result = { ...cert, locked: !shouldBeUnlocked, requirement: requirementText, hasManualRule };
              console.log(`📝 Cert ${cert.title}: requirement="${requirementText}", manual=${hasManualRule}`);
              return result;
            })
          );
          // ... existing code
        } else {
          // Pokud nemáme apprentice v storage, nastav flag
          setHasSelectedApprentice(false);
          const templates = await api.getCertificateTemplates().catch(() => []);
          allCerts = templates.map((t: any) => ({ ...t, locked: true, requirement: "N/A", hasManualRule: false }));
        }
      } else {
        // Pokud nemáme data v storage, nastav flag
        setHasSelectedApprentice(false);
        const templates = await api.getCertificateTemplates().catch(() => []);
        allCerts = templates.map((t: any) => ({ ...t, locked: true, requirement: "N/A", hasManualRule: false }));
      }

      console.log("🎯 MasterBadgesScreen - Konečný seznam:", allCerts?.length, allCerts);
      setAllBadges(allCerts);
    } catch (error) {
      console.error("Chyba při načítání certifikátů:", error);
      setAllBadges([]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const badges = allBadges.filter((item) => item.category === "Badge");
  const certificates = allBadges.filter((item) => item.category === "Certifikát");
  const displayItems = showBadges ? badges : certificates;

  const BadgeItem = ({ cert }: any) => {
    // Hvězdička pro certifikáty s manuální aktivací mistrem
    const isManual = cert.hasManualRule;

    return (
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
          {isManual && (
            <View style={[styles.manualBadge, { backgroundColor: theme.secondary }]}>
              <ThemedText style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>★</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[styles.badgeTitle, { fontWeight: "600", color: cert.locked ? theme.textSecondary : theme.text }]}>
          {cert.title}
        </ThemedText>
        <ThemedText style={[styles.badgeCategory, { color: theme.textSecondary }]}>
          {cert.category}
        </ThemedText>
        <ThemedText style={[styles.badgeDate, { color: cert.locked ? theme.textSecondary : theme.primary, fontSize: 12 }]}>
          {cert.locked ? "Zamčeno" : cert.date}
        </ThemedText>
        <View style={styles.badgePoints}>
          <Feather name="zap" size={14} color={cert.locked ? theme.border : theme.primary} />
          <ThemedText style={[styles.pointsText, { color: cert.locked ? theme.border : theme.primary }]}>
            {cert.points}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  const activateCertificate = async () => {
    const badge = selectedBadge;
    // Zavři okno HNED
    setSelectedBadge(null);
    setIsActivating(true);

    try {
      // DŮLEŽITÉ: Načti apprenticeId VŽDYCKY z AsyncStorage - NE z state!
      const storedData = await AsyncStorage.getItem("masterSelectedApprenticeData");
      if (!storedData) {
        console.error("❌ Žádná data o učedníkovi v storage!");
        setIsActivating(false);
        return;
      }

      const parsedData = JSON.parse(storedData);
      const currentApprenticeId = parsedData.apprenticeId || parsedData.id;

      if (!currentApprenticeId || !badge?.title) {
        console.error("❌ Chybí apprenticeId nebo badge");
        setIsActivating(false);
        return;
      }

      console.log("🔓 Aktivuji certifikát");
      const cert = await api.getCertificateByTitle(currentApprenticeId, badge.title);

      if (!cert?.id) {
        console.error("❌ Certifikát nenalezen pro apprentice:", currentApprenticeId, "title:", badge.title);
        setIsActivating(false);
        return;
      }

      await api.unlockCertificate(cert.id);

      setAllBadges((prev: any[]) => prev.map(b =>
        b.id === badge.id ? { ...b, locked: false } : b
      ));
      console.log("✅ Certifikát úspěšně aktivován:", badge.title);

      // Refresh data z databáze
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadData();
    } catch (error) {
      console.error("❌ Chyba při aktivaci:", error);
    }
    setIsActivating(false);
  };

  const deactivateCertificate = async () => {
    const badge = selectedBadge;
    // Zavři okno HNED
    setSelectedBadge(null);
    setIsActivating(true);

    try {
      // Deaktivuj certifikát - vrátí ho zpět na locked=true
      const storedData = await AsyncStorage.getItem("masterSelectedApprenticeData");
      if (!storedData) {
        console.error("❌ Žádná data o učedníkovi v storage!");
        setIsActivating(false);
        return;
      }

      const parsedData = JSON.parse(storedData);
      const currentApprenticeId = parsedData.apprenticeId || parsedData.id;

      if (!currentApprenticeId || !badge?.title) {
        console.error("❌ Chybí apprenticeId nebo badge");
        setIsActivating(false);
        return;
      }

      console.log("🔒 Deaktivuji certifikát");
      const cert = await api.getCertificateByTitle(currentApprenticeId, badge.title);

      if (!cert?.id) {
        console.error("❌ Certifikát nenalezen pro apprentice:", currentApprenticeId, "title:", badge.title);
        setIsActivating(false);
        return;
      }

      await api.lockCertificate(cert.id);

      setAllBadges((prev: any[]) => prev.map(b =>
        b.id === badge.id ? { ...b, locked: true } : b
      ));
      console.log("✅ Certifikát úspěšně deaktivován:", badge.title);

      // Refresh data z databáze
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadData();
    } catch (error) {
      console.error("❌ Chyba při deaktivaci:", error);
    }
    setIsActivating(false);
  };

  const BadgeModal = () => {
    if (!selectedBadge) return null;
    const isWork = selectedBadge.category === "Badge";
    const badgeColor = isWork ? theme.primary : theme.secondary;
    const isManual = selectedBadge.hasManualRule;

    console.log("🔎 BadgeModal - requirement:", selectedBadge.requirement, "title:", selectedBadge.title);

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
              {isManual && selectedBadge.locked && (
                <View style={[styles.manualBadge, { backgroundColor: theme.secondary }]}>
                  <Feather name="star" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>

            <ThemedText style={[styles.modalTitle, { color: badgeColor, fontWeight: "700" }]}>
              {selectedBadge.title}
            </ThemedText>

            <ThemedText style={[styles.modalCategory, { color: theme.textSecondary }]}>
              {selectedBadge.category}
              {isManual && selectedBadge.locked && (
                <ThemedText style={[styles.manualLabel, { color: theme.secondary }]}>
                  {" "}(Odemknutí mistrem)
                </ThemedText>
              )}
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

            {isManual && selectedBadge.locked && (
              <Pressable
                onPress={activateCertificate}
                disabled={isActivating}
                style={[styles.closeButton, { backgroundColor: theme.secondary, opacity: isActivating ? 0.6 : 1, marginBottom: Spacing.md }]}
              >
                <ThemedText style={[styles.closeButtonText]}>
                  {isActivating ? "Aktivuji..." : "Aktivovat"}
                </ThemedText>
              </Pressable>
            )}

            {isManual && !selectedBadge.locked && (
              <Pressable
                onPress={deactivateCertificate}
                disabled={isActivating}
                style={[styles.closeButton, { backgroundColor: "#FF6B6B", opacity: isActivating ? 0.6 : 1, marginBottom: Spacing.md }]}
              >
                <ThemedText style={[styles.closeButtonText]}>
                  {isActivating ? "Deaktivuji..." : "Deaktivovat"}
                </ThemedText>
              </Pressable>
            )}

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
  const totalPoints = allBadges.filter((cert) => !cert.locked).reduce((sum, cert) => sum + cert.points, 0);

  if (!hasSelectedApprentice) {
    return <NoApprenticeSelected />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Spacing.xl,
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
            {allBadges.filter((c) => !c.locked).length} / {allBadges.length}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.pageTitle, { paddingHorizontal: Spacing.lg, color: theme.text, marginBottom: Spacing.lg }]}>
        Boj o Tovaryšský list
      </ThemedText>

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
        {displayItems.map((cert) => (
          <BadgeItem key={cert.id} cert={cert} />
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
    ...Typography.h3,
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
  pageTitle: {
    ...Typography.h2,
    fontWeight: "700",
    textAlign: "center",
  },
  manualBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
