import React, { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { MaterialItem } from "@/components/MaterialItem";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing } from "@/constants/theme";

export default function MaterialsScreen() {
  const { theme } = useTheme();
  const insets = useScreenInsets();

  const [materials] = useState([
    { id: "1", title: "Bezpečnostní pokyny pro dílnu", type: "pdf" as const, dateShared: "před 2 dny" },
    { id: "2", title: "Tabulka druhů dřeva", type: "image" as const, dateShared: "před 5 dny" },
    { id: "3", title: "Základní techniky spojování", type: "video" as const, dateShared: "před týdnem" },
    { id: "4", title: "Průvodce údržbou nářadí", type: "pdf" as const, dateShared: "před týdnem" },
    { id: "5", title: "Proces povrchové úpravy kovu", type: "video" as const, dateShared: "před 2 týdny" },
  ]);

  if (materials.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.backgroundRoot }]}>
        <EmptyState
          image={require("../assets/images/illustrations/empty_state_no_materials.png")}
          title="Zatím žádné materiály"
          message="Tvůj mistr ještě nesdílel žádné studijní materiály. Brzy se podívej znovu!"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={materials}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MaterialItem
          title={item.title}
          type={item.type}
          dateShared={item.dateShared}
          onPress={() => {}}
        />
      )}
      contentContainerStyle={[
        styles.listContent,
        {
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom,
        },
      ]}
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
});
