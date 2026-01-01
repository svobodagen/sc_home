import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";

interface MaterialItemProps {
  title: string;
  type: "pdf" | "image" | "video";
  dateShared: string;
  onPress: () => void;
}

export function MaterialItem({ title, type, dateShared, onPress }: MaterialItemProps) {
  const { theme } = useTheme();

  const iconMap = {
    pdf: "file-text" as const,
    image: "image" as const,
    video: "video" as const,
  };

  const colorMap = {
    pdf: theme.error,
    image: theme.secondary,
    video: theme.primary,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colorMap[type] + "15" }]}>
        <Feather name={iconMap[type]} size={24} color={colorMap[type]} />
      </View>
      <View style={styles.content}>
        <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</ThemedText>
        <ThemedText style={[styles.date, { color: theme.textSecondary }]}>
          Sdíleno {dateShared}
        </ThemedText>
      </View>
      <View style={[styles.downloadButton, { backgroundColor: theme.primary + "15" }]}>
        <Feather name="download" size={18} color={theme.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.body,
    fontWeight: "600",
  },
  date: {
    ...Typography.small,
    marginTop: 2,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
});
