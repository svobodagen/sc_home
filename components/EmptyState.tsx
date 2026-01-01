import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";

interface EmptyStateProps {
  image?: any;
  title: string;
  message: string;
}

export function EmptyState({ image, title, message }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {image && <Image source={image} style={styles.image} />}
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  image: {
    width: 160,
    height: 160,
    marginBottom: Spacing["2xl"],
  },
  title: {
    ...Typography.title,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  message: {
    ...Typography.body,
    textAlign: "center",
  },
});
