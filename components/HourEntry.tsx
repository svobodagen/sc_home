import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";

interface HourEntryProps {
  date: string;
  hours: number;
  description: string;
  approved?: boolean;
  onPress?: () => void;
}

export function HourEntry({ date, hours, description, approved = false, onPress }: HourEntryProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: approved ? theme.success + "15" : theme.warning + "15" }]}>
          <Feather name={approved ? "check-circle" : "clock"} size={20} color={approved ? theme.success : theme.warning} />
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={[styles.date, { color: theme.text }]}>{date}</ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSecondary }]} numberOfLines={1}>
            {description}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.hoursBadge, { backgroundColor: theme.primary + "15" }]}>
        <ThemedText style={[styles.hoursText, { color: theme.primary }]}>{hours}h</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  date: {
    ...Typography.body,
    fontWeight: "600",
  },
  description: {
    ...Typography.small,
    marginTop: 2,
  },
  hoursBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  hoursText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
