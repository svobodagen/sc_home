import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { BadgeDisplayData } from "@/services/BadgeCalculator";

interface AchievementBadgeProps {
  item: BadgeDisplayData;
  onPress: () => void;
  showInitials?: boolean;
  scale?: number;
}

export function AchievementBadge({ item, onPress, showInitials = true, scale = 1 }: AchievementBadgeProps) {
  const { theme } = useTheme();

  const isGray = item.iconColor === "gray";
  const primaryColor = item.category === "Odznak" ? theme.primary : theme.secondary;
  const cardBorderColor = isGray ? theme.border : primaryColor;
  const iconBgColor = isGray ? theme.backgroundRoot : primaryColor + "20";
  const iconColor = isGray ? theme.textSecondary : primaryColor;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.badgeCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: cardBorderColor,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale }],
          // Adjust width if scaling is applied to maintain layout flow if necessary, 
          // usually scale prop is enough for minor adjustments, but for grid items standardized width is better.
          // We'll keep fixed width from design.
        },
      ]}
    >
      {showInitials && item.initials.length > 0 && !item.isLocked && (
        <View style={styles.initialsContainer}>
          {item.initials.map((init, idx) => {
            const isPlus = init === "+";
            return (
              <View key={idx} style={[styles.miniBadge, { borderColor: primaryColor, backgroundColor: theme.backgroundDefault }]}>
                {isPlus ? (
                  <Feather name="plus" size={14} color={primaryColor} />
                ) : (
                  <ThemedText style={[styles.miniBadgeText, { color: primaryColor }]}>
                    {init}
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.badgeIcon, { backgroundColor: iconBgColor }]}>
        <Feather
          name={isGray ? "lock" : (item.category === "Odznak" ? "award" : "file-text")}
          size={32}
          color={iconColor}
        />
      </View>

      <ThemedText style={[styles.badgeTitle, { fontWeight: "600", color: isGray ? theme.textSecondary : theme.text }]} numberOfLines={2}>
        {item.headerTitle}
      </ThemedText>



      <View style={styles.badgePoints}>
        <Feather name="zap" size={14} color={isGray ? theme.border : primaryColor} />
        <ThemedText style={[styles.pointsText, { color: isGray ? theme.border : primaryColor }]}>
          {item.points}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badgeCard: {
    width: 155, // Fixed width matching approx 48% on most phones, or specifically set. 
    // BadgesScreen used "48%" in a flex-wrap container. Here we might need to be flexible or fixed.
    // Let's settle on a standard size or handle style override. 
    // Actually, best to let parent control width if in grid, but internal spacing fixed.
    // For now, let's reset width via style prop or defaults.
    // In BadgesScreen it was 48%. If we use this component in a horizontal ScrollView, we need fixed width.
    minWidth: 140,
    maxWidth: 160,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    // Margin handled by parent
  },
  initialsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: Spacing.sm,
    justifyContent: 'center', // Center initials
  },
  miniBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 2,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 12,
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
    fontSize: 13,
    height: 36, // Fixed height for 2 lines to align grid
  },
  badgeCategory: {
    ...Typography.small,
    fontSize: 11,
    marginBottom: Spacing.xs,
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
});
