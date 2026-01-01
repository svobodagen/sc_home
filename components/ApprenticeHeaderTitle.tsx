import React, { useState, useEffect } from "react";
import { View, StyleSheet, Image, Pressable, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { api } from "@/services/api";

interface ApprenticeHeaderTitleProps {
  showApprenticeNameOnly?: boolean;
}

export function ApprenticeHeaderTitle({ showApprenticeNameOnly = false }: ApprenticeHeaderTitleProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { userData, setSelectedMaster } = useData();
  const [selectedApprenticeName, setSelectedApprenticeName] = useState<string | null>(null);
  const [apprenticeMasters, setApprenticeMasters] = useState<{ id: string; name: string }[]>([]);

  // Find selected master for display
  const selectedMaster = apprenticeMasters.find(m => m.id === userData.selectedMasterId);


  const loadMasterSelection = React.useCallback(async () => {
    if (user?.role === "Mistr") {
      const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
      if (data) {
        const parsed = JSON.parse(data);
        setSelectedApprenticeName(parsed.name);
      } else {
        setSelectedApprenticeName(null);
      }
    } else if (user?.role === "Učedník") {
      try {
        const connections = await api.getMastersForApprentice(user.id);
        if (connections.length > 0) {
          const allUsers = await api.getUsers();
          const masters = connections.map(c => {
            const m = allUsers.find((u: any) => u.id === c.master_id);
            return {
              id: c.master_id,
              name: m ? m.name : "Neznámý mistr"
            };
          });
          setApprenticeMasters(masters);
        } else {
          setApprenticeMasters([]);
        }
      } catch (err) {
        setApprenticeMasters([]);
      }
    }
  }, [user?.role, user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      loadMasterSelection();
    }, [loadMasterSelection])
  );

  useEffect(() => {
    const interval = setInterval(loadMasterSelection, 1000); // Check every second for updates
    return () => clearInterval(interval);
  }, [loadMasterSelection]);

  if (showApprenticeNameOnly) {
    // This prop might be deprecated with this new design, but keeping for backward compatibility if used comfortably elsewhere
    // But user asked for a dominant header everywhere.
    // I'll render the full header but maybe smaller? No, let's keep it consistent.
    // If showApprenticeNameOnly was used, it was likely for specific screens.
    // Let's stick to the main request: "nelíbí se mi design hlavičky... chci aby logo a text svobodné cechy byl dominantní"
  }

  const handleMasterSwitch = () => {
    if (user?.role === "Mistr") return;
    if (apprenticeMasters.length === 0) return;

    const currentIndex = apprenticeMasters.findIndex(m => m.id === userData.selectedMasterId);
    let nextIndex;

    if (currentIndex === -1 || userData.selectedMasterId === null) {
      nextIndex = 0;
    } else if (currentIndex === apprenticeMasters.length - 1) {
      setSelectedMaster("Všichni", null);
      return;
    } else {
      nextIndex = currentIndex + 1;
    }

    const nextMaster = apprenticeMasters[nextIndex];
    setSelectedMaster(nextMaster.name, nextMaster.id);
  };

  return (
    <View style={styles.container}>
      {/* Row 1: Brand */}
      <View style={styles.brandRow}>
        <Image
          source={require("../assets/images/logo-cechy.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText style={styles.brandText}>Svobodné cechy</ThemedText>
      </View>

      {/* Row 2: Context Info */}
      {user?.role === "Host" ? (
        <View style={[styles.infoRow, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="eye" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Návštěvník:</ThemedText>
          <ThemedText style={[styles.infoValue, { color: theme.text }]}>{user.name}</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.infoLabel, { color: theme.primary, fontWeight: "700" }]}>Prohlížení Cechu</ThemedText>
        </View>
      ) : (
        <Pressable
          onPress={handleMasterSwitch}
          style={({ pressed }) => [
            styles.infoRow,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundSecondary,
              opacity: (pressed && user?.role !== "Mistr") ? 0.7 : 1
            }
          ]}
        >
          {user?.role === "Mistr" ? (
            <>
              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Mistr:</ThemedText>
              <ThemedText style={[styles.infoValue, { color: theme.text }]}>{user.name}</ThemedText>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Učedník:</ThemedText>
              <ThemedText style={[styles.infoValue, { color: theme.primary, fontWeight: "700" }]}>
                {selectedApprenticeName || "Nevybrán"}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Učedník:</ThemedText>
              <ThemedText style={[styles.infoValue, { color: theme.text }]}>{user?.name}</ThemedText>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Mistr:</ThemedText>
              <View style={styles.masterSelector}>
                {apprenticeMasters.length > 0 ? (
                  (() => {


                    if (userData.selectedMasterId === null) {
                      // Show "Všichni"
                      return (
                        <Text style={{ color: "#A855F7", fontSize: 12, fontWeight: "700" }}>
                          Všichni
                        </Text>
                      );
                    } else {
                      // Show selected master
                      return (
                        <Text style={{ color: "#A855F7", fontSize: 12, fontWeight: "700" }}>
                          {selectedMaster?.name || "Nevybrán"}
                        </Text>
                      );
                    }
                  })()
                ) : (
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    Nevybrán
                  </Text>
                )}
              </View>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 0,
    paddingBottom: 0,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: -30, // Independently move brand text/logo higher
  },
  logo: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  infoRow: {
    position: "absolute",
    bottom: -40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16, // Zvýšeno pro vzdušnost
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden", // Ensure opacity layer stays within bounds
  },
  infoLabel: {
    fontSize: 12,
    marginRight: 4,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  divider: {
    width: 1,
    height: 10,
    marginHorizontal: 8,
  },
  masterSelector: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
});
