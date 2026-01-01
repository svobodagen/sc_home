import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography, Shadow } from "@/constants/theme";

interface ProjectCardProps {
  title: string;
  date: string;
  imageUrl?: any;
  category: string;
  onPress: () => void;
  onEdit?: () => void;
  masterComment?: string;
  isLiked?: boolean;
  authorName?: string;
  masterInitials?: string;
  masterName?: string;
}

export function ProjectCard({ title, date, imageUrl, category, onPress, onEdit, masterComment, isLiked, authorName, masterInitials, masterName }: ProjectCardProps) {
  const { theme } = useTheme();

  const categoryColors: Record<string, string> = {
    "Dřevářství": theme.craftWood,
    "Kovářství": theme.craftMetal,
    "Kuchařství": theme.craftCulinary,
    "Stavebnictví": theme.craftConstruction,
  };

  const backgroundColor = categoryColors[category] || theme.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundSecondary,
          opacity: pressed ? 0.95 : 1,
          borderWidth: 1,
          borderColor: theme.border,
        },
        Shadow.card,
      ]}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor }]} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={2}>{title}</ThemedText>
            <View style={styles.authorRow}>
              {authorName && (
                <ThemedText style={[styles.authorName, { color: theme.primary }]}>{authorName}</ThemedText>
              )}
              <ThemedText style={[styles.date, { color: theme.textSecondary }]}>{authorName ? " • " : ""}{date}</ThemedText>
              {!masterName && masterInitials && (
                <View style={[styles.masterBadge, { borderColor: theme.textSecondary }]}>
                  <ThemedText style={[styles.masterBadgeText, { color: theme.textSecondary }]}>{masterInitials}</ThemedText>
                </View>
              )}
            </View>
          </View>
          {isLiked && (
            <View style={styles.likeContainer}>
              <MaterialCommunityIcons name="heart" size={20} color="#FF3B30" />
            </View>
          )}
        </View>
        {category && category !== "Další" && category !== "Neurčeno" ? (
          <View style={[styles.badge, { borderColor: backgroundColor, borderWidth: 1.5 }]}>
            <ThemedText style={[styles.badgeText, { color: backgroundColor }]}>{category}</ThemedText>
          </View>
        ) : null}
        {masterName && (
          <View style={[styles.masterNameBox, { borderColor: theme.text, backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary }]}>Mistr: </ThemedText>
            <ThemedText style={[styles.masterNameValue, { color: theme.text }]}>{masterName}</ThemedText>
          </View>
        )}
        {masterComment && (
          <View style={[styles.masterCommentPreview, { borderColor: theme.text, backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-circle" size={14} color={theme.primary} />
            <ThemedText style={[styles.masterCommentText, { color: theme.primary }]} numberOfLines={1}>
              {masterComment}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 175,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: 175,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
    marginHorizontal: -Spacing.md,
    marginTop: -Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  likeContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  title: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  date: {
    ...Typography.small,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  authorName: {
    ...Typography.small,
    fontWeight: "700",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "transparent",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  masterCommentPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  masterCommentText: {
    fontSize: 12,
    flex: 1,
  },
  masterBadge: {
    marginLeft: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  masterBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 11,
  },
  masterNameText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  masterNameBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  masterNameLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  masterNameValue: {
    fontSize: 12,
    fontWeight: "500",
  },
});
