import React, { useState, useEffect } from "react";
import { View, Pressable, FlatList, ScrollView, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useMaster } from "@/contexts/MasterContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";

export default function MastersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { apprentices } = useMaster();
  
  const [selectedApprenticeId, setSelectedApprenticeId] = useState<string | null>(null);
  const [apprenticeData, setApprenticeData] = useState<any>(null);

  useEffect(() => {
    if (selectedApprenticeId) {
      loadApprenticeData(selectedApprenticeId);
    }
  }, [selectedApprenticeId]);

  const loadApprenticeData = async (apprenticeId: string) => {
    try {
      console.log("📥 Načítám data pro učedníka:", apprenticeId);
      
      // Najdi učedníka ze seznamu aby měl jméno a email
      const apprentice = apprentices.find((a: any) => a.apprenticeId === apprenticeId);
      
      // Načti všechna data přímo z API
      const [projects, workHours, certificates] = await Promise.all([
        api.getProjects(apprenticeId).catch(() => []),
        api.getWorkHours(apprenticeId).catch(() => []),
        api.getCertificates(apprenticeId).catch(() => []),
      ]);

      console.log("📦 Načtena data - Projekty:", projects?.length, "Časy:", workHours?.length, "Certifikáty:", certificates?.length);
      
      // Přidej "Boj o Tovaryšský list" text do Tovaryš certifikátu
      const enrichedCerts = (certificates || []).map((cert: any) => {
        if (cert.title === "Tovaryš") {
          return { ...cert, subtitle: "Boj o Tovaryšský list" };
        }
        return cert;
      });
      
      const data = {
        apprenticeId,
        apprenticeName: apprentice?.apprenticeName || "Učedník",
        apprenticeEmail: apprentice?.apprenticeEmail || "",
        projects: projects || [],
        workHours: workHours || [],
        certificates: enrichedCerts,
      };
      
      console.log("🎯 MastersScreen - Uklád do AsyncStorage, certificates count:", enrichedCerts.length);
      
      setApprenticeData(data);
      
      // Ulož do AsyncStorage pro MasterBadgesScreen
      await AsyncStorage.setItem("masterSelectedApprenticeData", JSON.stringify(data));
    } catch (error) {
      console.error("Chyba při načítání dat učedníka:", error);
      setApprenticeData({
        projects: [],
        workHours: [],
        certificates: [],
      });
    }
  };

  const getTotalHours = () => {
    if (!apprenticeData?.workHours) return 0;
    return apprenticeData.workHours.reduce((sum: number, hour: any) => sum + (hour.hours || hour.duration || 0), 0);
  };

  const renderApprentice = ({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [
        styles.apprenticeCard,
        {
          backgroundColor: selectedApprenticeId === item.apprenticeId ? theme.primary + "20" : theme.backgroundSecondary,
          borderColor: selectedApprenticeId === item.apprenticeId ? theme.primary : "transparent",
          borderWidth: selectedApprenticeId === item.apprenticeId ? 2 : 0,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() => setSelectedApprenticeId(item.apprenticeId)}
    >
      <View style={styles.apprenticeHeader}>
        <View>
          <ThemedText style={styles.apprenticeName}>{item.apprenticeName}</ThemedText>
          <ThemedText style={styles.apprenticeEmail}>{item.apprenticeEmail}</ThemedText>
        </View>
        {selectedApprenticeId === item.apprenticeId && (
          <Feather name="check" size={20} color={theme.primary} />
        )}
      </View>
    </Pressable>
  );

  const renderApprenticeData = () => {
    if (!selectedApprenticeId || !apprenticeData) {
      return (
        <ThemedView style={styles.emptyDataCard}>
          <Feather name="arrow-left" size={40} color={theme.textSecondary} />
          <ThemedText style={styles.emptyDataText}>Vyberte učedníka ze seznamu</ThemedText>
        </ThemedView>
      );
    }

    return (
      <View style={styles.dataSection}>
        <ThemedText style={styles.dataTitle}>Projekty</ThemedText>
        {apprenticeData.projects.length > 0 ? (
          <FlatList
            data={apprenticeData.projects}
            renderItem={({ item }) => (
              <ThemedView style={styles.projectItem}>
                <ThemedText style={styles.projectName}>{item.title}</ThemedText>
                <ThemedText style={[styles.projectDate, { color: theme.textSecondary }]}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("cs-CZ") : "Neznámé datum"}
                </ThemedText>
              </ThemedView>
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <ThemedText style={[styles.emptyItemText, { color: theme.textSecondary }]}>Žádné projekty</ThemedText>
        )}

        <ThemedText style={[styles.dataTitle, { marginTop: Spacing.xl }]}>Uložené časy</ThemedText>
        <View style={styles.hoursStats}>
          <View style={styles.hoursStat}>
            <ThemedText style={styles.hoursNumber}>{getTotalHours()}h</ThemedText>
            <ThemedText style={[styles.hoursLabel, { color: theme.textSecondary }]}>Celkem</ThemedText>
          </View>
          <View style={styles.hoursStat}>
            <ThemedText style={styles.hoursNumber}>{apprenticeData.workHours.length}</ThemedText>
            <ThemedText style={[styles.hoursLabel, { color: theme.textSecondary }]}>Záznamů</ThemedText>
          </View>
        </View>

        {apprenticeData.workHours.length > 0 ? (
          <FlatList
            data={apprenticeData.workHours}
            renderItem={({ item }) => (
              <ThemedView style={styles.hourItem}>
                <View style={styles.hourLeft}>
                  <ThemedText style={styles.hourValue}>{item.hours}h</ThemedText>
                  <ThemedText style={[styles.hourDesc, { color: theme.textSecondary }]}>
                    {item.description}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.hourDate, { color: theme.textSecondary }]}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("cs-CZ") : "Neznámé datum"}
                </ThemedText>
              </ThemedView>
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <ThemedText style={[styles.emptyItemText, { color: theme.textSecondary }]}>Žádné uložené časy</ThemedText>
        )}

        <ThemedText style={[styles.dataTitle, { marginTop: Spacing.xl }]}>Certifikáty</ThemedText>
        {apprenticeData.certificates && apprenticeData.certificates.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginBottom: Spacing.lg }}>
            {apprenticeData.certificates.map((badge: any) => (
              <Pressable
                key={badge.id}
                style={styles.badgeWrapper}
              >
                <View
                  style={[
                    styles.badgeCard,
                    {
                      backgroundColor: badge.category === "Badge" ? theme.primary + "20" : theme.secondary + "20",
                      borderColor: badge.category === "Badge" ? theme.primary : theme.secondary,
                    },
                  ]}
                >
                  <Feather
                    name="award"
                    size={32}
                    color={badge.category === "Badge" ? theme.primary : theme.secondary}
                  />
                  <ThemedText style={[styles.badgeTitle, { color: theme.text, marginTop: Spacing.sm }]}>
                    {badge.title}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.emptyItemText, { color: theme.textSecondary }]}>
            Zatím žádné úspěchy
          </ThemedText>
        )}
      </View>
    );
  };

  if (user?.role !== "Mistr") {
    return (
      <ScreenKeyboardAwareScrollView>
        <View style={styles.container}>
          <ThemedText style={styles.errorText}>Tato sekce je pouze pro mistry</ThemedText>
        </View>
      </ScreenKeyboardAwareScrollView>
    );
  }

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.container}>
        <ThemedText style={styles.title}>Moji učedníci</ThemedText>

        {apprentices.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Feather name="users" size={40} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>Zatím nemáte žádné učedníky</ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.contentWrapper}>
            <View style={styles.listSection}>
              <FlatList
                data={apprentices}
                renderItem={renderApprentice}
                keyExtractor={(item) => item.apprenticeId}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
              />
            </View>

            <View style={styles.dataWrapper}>
              {renderApprenticeData()}
            </View>
          </View>
        )}
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: Spacing.lg,
  },
  contentWrapper: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  listSection: {
    flex: 0.4,
  },
  dataWrapper: {
    flex: 0.6,
  },
  apprenticeCard: {
    padding: Spacing.lg,
    borderRadius: 12,
  },
  apprenticeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  apprenticeName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  apprenticeEmail: {
    fontSize: 12,
    opacity: 0.7,
  },
  dataSection: {
    gap: Spacing.md,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  projectItem: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  projectName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  projectDate: {
    fontSize: 12,
  },
  hoursStats: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  hoursStat: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  hoursNumber: {
    fontSize: 20,
    fontWeight: "bold",
  },
  hoursLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  hourItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  hourLeft: {
    flex: 1,
  },
  hourValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  hourDesc: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  hourDate: {
    fontSize: 12,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  emptyDataCard: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDataText: {
    fontSize: 16,
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  emptyItemText: {
    fontSize: 14,
    marginVertical: Spacing.md,
  },
  certificateItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  certificateLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  certificateName: {
    fontSize: 14,
    fontWeight: "600",
  },
  certificateCategory: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  earnedDate: {
    fontSize: 12,
  },
  certificateBadge: {
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  certificateBadgeTitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  achievementsScroll: {
    paddingLeft: 0,
    marginBottom: 0,
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
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
