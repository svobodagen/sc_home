import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";

interface AchievementBadgeProps {
  title: string;
  image: any;
  unlocked?: boolean;
}

export function AchievementBadge({ title, image, unlocked = false }: AchievementBadgeProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Image
        source={image}
        style={[styles.badge, { opacity: unlocked ? 1 : 0.3 }]}
      />
      <ThemedText style={[styles.title, { color: unlocked ? theme.text : theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 80,
    marginRight: Spacing.md,
  },
  badge: {
    width: 64,
    height: 64,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.label,
    textAlign: "center",
  },
});
