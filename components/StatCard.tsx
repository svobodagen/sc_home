import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography, Shadow } from "@/constants/theme";

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ icon, label, value, color }: StatCardProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.primary;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + "15" }]}>
        <Feather name={icon} size={28} color={iconColor} />
      </View>
      <View style={styles.content}>
        <ThemedText style={[styles.value, { color: theme.text }]}>{value}</ThemedText>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  content: {
    width: "100%",
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.small,
    fontWeight: "500",
  },
});
