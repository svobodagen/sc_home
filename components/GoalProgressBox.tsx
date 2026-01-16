import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useData, ApprenticeGoals, AdminSettings } from "@/contexts/DataContext";
import { api } from "@/services/api";

type Period = "week" | "month" | "year";
type HourType = "work" | "study";

interface GoalProgressBoxProps {
  userId?: string;
  userLimits?: AdminSettings | null;
  workHours?: any[];
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const periodLabels: Record<Period, string> = {
  week: "Tyden",
  month: "Mesic",
  year: "Rok",
};

export function GoalProgressBox({ userId, userLimits, workHours }: GoalProgressBoxProps) {
  const { theme } = useTheme();
  const {
    apprenticeGoals,
    adminSettings,
    getWeeklyWorkHours,
    getWeeklyStudyHours,
    getMonthlyWorkHours,
    getMonthlyStudyHours,
    getYearlyWorkHours,
    getYearlyStudyHours,
  } = useData();

  const [period, setPeriod] = useState<Period>("week");
  const [displayGoals, setDisplayGoals] = useState<ApprenticeGoals | null>(null);
  const scale = useSharedValue(1);

  useEffect(() => {
    const loadGoals = async () => {
      if (userId) {
        try {
          const goals = await api.getApprenticeGoals(userId);
          setDisplayGoals(goals);
        } catch (e) {
          console.error("Chyba pri nacitani cilu:", e);
        }
      } else {
        setDisplayGoals(apprenticeGoals);
      }
    };
    loadGoals();
  }, [userId, apprenticeGoals]);

  const limits = userLimits ?? adminSettings;
  const goals = displayGoals ?? apprenticeGoals;

  const getHoursForPeriod = (type: HourType): number => {
    if (workHours) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (period === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
      } else if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
      }
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const typeLabel = type === "work" ? "Prace" : "Studium";
      return workHours
        .filter(h => {
          const hDate = new Date(h.timestamp || h.created_at || 0);
          return hDate >= startDate && hDate <= endDate &&
            (h.description?.includes(typeLabel) || h.description?.includes(type === "work" ? "Práce" : "Studium"));
        })
        .reduce((sum, h) => sum + (h.hours || 0), 0);
    }

    if (type === "work") {
      switch (period) {
        case "week": return getWeeklyWorkHours();
        case "month": return getMonthlyWorkHours();
        case "year": return getYearlyWorkHours();
      }
    } else {
      switch (period) {
        case "week": return getWeeklyStudyHours();
        case "month": return getMonthlyStudyHours();
        case "year": return getYearlyStudyHours();
      }
    }
  };

  const getGoalForPeriod = (type: HourType): number => {
    if (!goals) return 0;
    if (type === "work") {
      switch (period) {
        case "week": return goals.work_goal_week ?? 20;
        case "month": return goals.work_goal_month ?? 80;
        case "year": return goals.work_goal_year ?? 960;
      }
    } else {
      switch (period) {
        case "week": return goals.study_goal_week ?? 10;
        case "month": return goals.study_goal_month ?? 40;
        case "year": return goals.study_goal_year ?? 480;
      }
    }
  };

  const getMaxForPeriod = (type: HourType): number => {
    if (!limits) return type === "work" ? 40 : 20;
    if (type === "work") {
      switch (period) {
        case "week": return limits.max_work_hours_week ?? 40;
        case "month": return limits.max_work_hours_month ?? 160;
        case "year": return limits.max_work_hours_year ?? 1920;
      }
    } else {
      switch (period) {
        case "week": return limits.max_study_hours_week ?? 20;
        case "month": return limits.max_study_hours_month ?? 80;
        case "year": return limits.max_study_hours_year ?? 960;
      }
    }
  };

  const handlePress = () => {
    const periods: Period[] = ["week", "month", "year"];
    const currentIndex = periods.indexOf(period);
    const nextIndex = (currentIndex + 1) % periods.length;
    setPeriod(periods[nextIndex]);
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderProgressBar = (type: HourType, label: string, color: string) => {
    const current = getHoursForPeriod(type);
    const goal = getGoalForPeriod(type);
    const max = getMaxForPeriod(type);

    const effectiveMax = Math.max(max, goal, current);
    const progressPercent = effectiveMax > 0 ? Math.min((current / effectiveMax) * 100, 100) : 0;
    const goalPercent = effectiveMax > 0 ? Math.min((goal / effectiveMax) * 100, 100) : 0;
    const goalVsCurrent = goal > 0 ? Math.round((current / goal) * 100) : 0;

    const isOverGoal = current > goal;
    const isOverMax = current > max;

    return (
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {label}
          </ThemedText>
          <ThemedText type="small" style={{
            color: isOverMax ? theme.error : isOverGoal ? theme.warning : theme.success,
            fontWeight: "600"
          }}>
            {goalVsCurrent}%
          </ThemedText>
        </View>

        <View style={[styles.progressBarContainer, { backgroundColor: theme.backgroundTertiary }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isOverMax ? theme.error : isOverGoal ? theme.warning : color,
              }
            ]}
          />
          {goalPercent > 0 && goalPercent <= 100 && (
            <View
              style={[
                styles.goalMarker,
                {
                  left: `${goalPercent}%`,
                  backgroundColor: theme.text,
                }
              ]}
            />
          )}
        </View>

        <View style={styles.hoursRow}>
          <ThemedText style={{ fontSize: 24, fontWeight: "700", lineHeight: 28, color: color }}>
            {current} h
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textTertiary }}>
            {" / "}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.success, fontWeight: "600" }}>
            {goal} h
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textTertiary }}>
            {" / "}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textTertiary }}>
            max {max} h
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundSecondary },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="target" size={18} color={theme.primary} />
          <ThemedText type="h4" style={styles.title}>
            Cil - {periodLabels[period]}
          </ThemedText>
        </View>
        <View style={[styles.periodBadge, { backgroundColor: theme.primary + "20" }]}>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {period === "week" ? "T" : period === "month" ? "M" : "R"}
          </ThemedText>
        </View>
      </View>

      {renderProgressBar("work", "Prace", theme.primary)}
      {renderProgressBar("study", "Studium", theme.secondary)}

      <ThemedText type="small" style={[styles.hint, { color: theme.textTertiary }]}>
        Klepni pro zmenu obdobi
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    marginLeft: Spacing.xs,
  },
  periodBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: "visible",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  goalMarker: {
    position: "absolute",
    top: -2,
    width: 3,
    height: 16,
    borderRadius: 1.5,
    marginLeft: -1.5,
  },
  hint: {
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});
