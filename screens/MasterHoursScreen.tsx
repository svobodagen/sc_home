import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable, FlatList, TextInput, Alert, Modal, Platform, Switch, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "@/services/api";
import { SlotWheelPicker } from "@/components/SlotWheelPicker";
import { NoApprenticeSelected } from "@/components/NoApprenticeSelected";

type TimeFrame = "week" | "month" | "year";

interface WorkHour {
  id: number;
  timestamp: number;
  hours: number;
  description: string;
  master_comment?: string;
}

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getDateFromWeekNumber = (year: number, week: number): Date => {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const targetMonday = new Date(mondayOfWeek1);
  targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  return targetMonday;
};

export default function MasterHoursScreen() {
  const { theme } = useTheme();
  const { user } = useAuth(); // Add useAuth
  const insets = useScreenInsets();

  const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
  const [showAllHistory, setShowAllHistory] = useState(false); // New state

  const today = new Date();
  const currentWeekNum = getWeekNumber(today);
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [selectedWeek, setSelectedWeek] = useState(currentWeekNum);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [totalsPeriod, setTotalsPeriod] = useState<TimeFrame>('week');

  // Commenting state
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Custom alert state for web
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertVisible(true);
    } else {
      Alert.alert(title, message);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const loadMasterApprenticeData = async () => {
        const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
        if (data) {
          const parsed = JSON.parse(data);
          // Refresh work hours from API to get latest comments
          if (parsed.id) {
            try {
              const refreshedHours = await api.getWorkHours(parsed.id);
              parsed.workHours = refreshedHours;
            } catch (e) {
              console.error("Failed to refresh work hours", e);
            }
          }
          setSelectedApprenticeData(parsed);
        } else {
          // Explicitly set to null if no data
          setSelectedApprenticeData(null);
        }
      };
      loadMasterApprenticeData();
    }, [])
  );

  /* REMOVED EARLY RETURN */

  // Filter Logic:
  const allRawWorkHours = selectedApprenticeData?.workHours || [];
  const filteredRawWorkHours = useMemo(() => {
    if (showAllHistory) return allRawWorkHours;
    return allRawWorkHours.filter((h: any) => !h.master_id || h.master_id === user?.id);
  }, [allRawWorkHours, showAllHistory, user?.id]);

  const workHours: WorkHour[] = useMemo(() => {
    if (!Array.isArray(filteredRawWorkHours)) return [];
    return filteredRawWorkHours.map((item, index) => ({
      id: typeof item?.id === 'number' ? item.id : parseInt(item?.id || 0, 10),
      hours: parseFloat(item?.hours || 0),
      timestamp: typeof item?.timestamp === 'number' ? item.timestamp : parseInt(item?.timestamp || 0, 10),
      description: item?.description ? String(item.description) : "",
      master_comment: item?.master_comment || ""
    }));
  }, [filteredRawWorkHours]);

  /* REMOVED EARLY RETURN FROM HERE TOO */

  // Date Logic Helpers
  const getYearForWeek = (baseYear: number, month: number, weekNum: number): number => {
    if (month === 12 && weekNum <= 5) return baseYear + 1;
    if (month === 1 && weekNum >= 48) return baseYear - 1;
    return baseYear;
  };

  const getWeeksInMonth = (year: number, month: number): number[] => {
    const weeks: Set<number> = new Set();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      weeks.add(getWeekNumber(new Date(d)));
    }

    const weeksArray = Array.from(weeks);
    const hasHighWeeks = weeksArray.some(w => w >= 48);
    const hasLowWeeks = weeksArray.some(w => w <= 5);

    return weeksArray.sort((a, b) => {
      if (hasHighWeeks && hasLowWeeks) {
        if (a >= 48 && b <= 5) return -1;
        if (b >= 48 && a <= 5) return 1;
      }
      return a - b;
    });
  };

  useEffect(() => {
    const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth);
    if (!weeksInMonth.includes(selectedWeek)) {
      setSelectedWeek(weeksInMonth[0] || 1);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const weekYear = getYearForWeek(selectedYear, selectedMonth, selectedWeek);
    const mondayOfSelectedWeek = getDateFromWeekNumber(weekYear, selectedWeek);
    setSelectedDate(mondayOfSelectedWeek);
  }, [selectedWeek, selectedYear, selectedMonth]);


  const getDateRangeForWeek = (year: number, week: number) => {
    const monday = getDateFromWeekNumber(year, week);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    monday.setHours(0, 0, 0, 0);
    sunday.setHours(23, 59, 59, 999);
    return { startDate: monday, endDate: sunday };
  };

  const getDateRangeForMonth = (year: number, month: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  };

  const getDateRangeForYear = (year: number) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  };

  const isDateInRange = (timestamp: number, startDate: Date, endDate: Date): boolean => {
    if (isNaN(timestamp) || !isFinite(timestamp)) return false;
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date >= startDate && date <= endDate;
  };

  const { startDate, endDate } = useMemo(() => {
    if (totalsPeriod === 'week') {
      const weekYear = getYearForWeek(selectedYear, selectedMonth, selectedWeek);
      return getDateRangeForWeek(weekYear, selectedWeek);
    } else if (totalsPeriod === 'month') {
      return getDateRangeForMonth(selectedYear, selectedMonth);
    } else {
      return getDateRangeForYear(selectedYear);
    }
  }, [selectedYear, selectedWeek, selectedMonth, totalsPeriod]);

  const groupedHours = useMemo(() => {
    const filteredWorkHours = workHours
      .filter((h: WorkHour) => isDateInRange(h.timestamp, startDate, endDate))
      .sort((a: WorkHour, b: WorkHour) => a.timestamp - b.timestamp);

    const groupedByDate = filteredWorkHours.reduce((acc: Record<string, { date: Date; hours: WorkHour[] }>, hour: WorkHour) => {
      const date = new Date(hour.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!acc[dateKey]) {
        acc[dateKey] = { date, hours: [] };
      }
      acc[dateKey].hours.push(hour);
      return acc;
    }, {});

    Object.values(groupedByDate).forEach(group => {
      group.hours.sort((a: WorkHour, b: WorkHour) => {
        const aIsWork = a.description.includes("Práce");
        const bIsWork = b.description.includes("Práce");
        if (aIsWork && !bIsWork) return -1;
        if (!aIsWork && bIsWork) return 1;
        return 0;
      });
    });

    return Object.values(groupedByDate);
  }, [workHours, startDate, endDate]);

  const calculateTotalsForRange = (startDate: Date, endDate: Date) => {
    const work = workHours
      .filter((h: WorkHour) => h.description.includes("Práce") && isDateInRange(h.timestamp, startDate, endDate))
      .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
    const study = workHours
      .filter((h: WorkHour) => h.description.includes("Studium") && isDateInRange(h.timestamp, startDate, endDate))
      .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
    return { work, study, total: work + study };
  };

  const weekTotals = useMemo(() => {
    const weekYear = getYearForWeek(selectedYear, selectedMonth, selectedWeek);
    const { startDate, endDate } = getDateRangeForWeek(weekYear, selectedWeek);
    return calculateTotalsForRange(startDate, endDate);
  }, [selectedYear, selectedMonth, selectedWeek, workHours]);

  const monthTotals = useMemo(() => {
    const { startDate, endDate } = getDateRangeForMonth(selectedYear, selectedMonth);
    return calculateTotalsForRange(startDate, endDate);
  }, [selectedYear, selectedMonth, workHours]);

  const yearTotals = useMemo(() => {
    const { startDate, endDate } = getDateRangeForYear(selectedYear);
    return calculateTotalsForRange(startDate, endDate);
  }, [selectedYear, workHours]);

  const weekData = useMemo(() => {
    const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth);
    return weeksInMonth.map((w, idx) => {
      const weekYear = getYearForWeek(selectedYear, selectedMonth, w);
      const showYear = weekYear !== selectedYear;
      const shortYear = String(weekYear).slice(-2);
      return {
        value: w,
        label: `${idx + 1}`,
        subLabel: showYear ? `(${w}/${shortYear})` : `(${w})`
      };
    });
  }, [selectedYear, selectedMonth]);

  const monthData = useMemo(() => {
    const monthNames = ["Led", "Uno", "Bre", "Dub", "Kve", "Cer", "Crv", "Srp", "Zar", "Rij", "Lis", "Pro"];
    return monthNames.map((name, idx) => ({ value: idx + 1, label: name }));
  }, []);

  const yearData = useMemo(() => {
    const years = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      years.push({ value: y, label: String(y) });
    }
    return years;
  }, [currentYear]);

  const formatHistoryDate = (date: Date) => {
    const dayName = ["Nedele", "Pondeli", "Utery", "Streda", "Ctvrtek", "Patek", "Sobota"][date.getDay()];
    return `${dayName} ${date.getDate()}.${date.getMonth() + 1}.`;
  };

  const getPeriodLabel = (): string => {
    if (totalsPeriod === 'week') {
      const weekYear = getYearForWeek(selectedYear, selectedMonth, selectedWeek);
      const { startDate, endDate } = getDateRangeForWeek(weekYear, selectedWeek);
      const startDay = startDate.getDate();
      const startMonth = startDate.getMonth() + 1;
      const endDay = endDate.getDate();
      const endMonth = endDate.getMonth() + 1;
      const year = endDate.getFullYear();

      if (startMonth === endMonth) {
        return `${startDay}-${endDay}.${endMonth}. ${year}`;
      } else {
        return `${startDay}.${startMonth}. - ${endDay}.${endMonth}. ${year}`;
      }
    } else if (totalsPeriod === 'month') {
      const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    } else {
      return `${selectedYear}`;
    }
  };

  // Comment functionality
  const startCommenting = (hour: WorkHour) => {
    setCommentingId(hour.id);
    setCommentText(hour.master_comment || "");
  };

  const saveComment = async () => {
    if (commentingId !== null) {
      setIsSavingComment(true);
      try {
        await api.updateWorkHourComment(commentingId, commentText);

        // Update local state
        const updatedWorkHours = selectedApprenticeData.workHours.map((h: any) =>
          h.id === commentingId ? { ...h, master_comment: commentText } : h
        );
        const updatedData = { ...selectedApprenticeData, workHours: updatedWorkHours };
        setSelectedApprenticeData(updatedData);
        await AsyncStorage.setItem("masterSelectedApprenticeData", JSON.stringify(updatedData));

        setCommentingId(null);
      } catch (error) {
        Alert.alert("Chyba", "Nepodařilo se uložit komentář");
      } finally {
        setIsSavingComment(false);
      }
    }
  };

  const DayGroupItem = ({ item }: any) => {
    const dayDate = item.date;
    const hours = item.hours;
    const itemDate = formatHistoryDate(dayDate);
    const today = new Date();
    const isToday = dayDate.getFullYear() === today.getFullYear() &&
      dayDate.getMonth() === today.getMonth() &&
      dayDate.getDate() === today.getDate();
    const totalDayHours = hours.reduce((sum: number, h: WorkHour) => sum + (h.hours || 0), 0);

    return (
      <View style={[styles.dayGroupCard, {
        backgroundColor: isToday ? theme.primary + "10" : theme.backgroundDefault,
        borderColor: isToday ? theme.primary : theme.border,
        borderWidth: isToday ? 2 : 1,
      }]}>
        <View style={[styles.dayGroupTitleRow, { borderBottomColor: isToday ? theme.primary : theme.border }]}>
          <ThemedText style={[styles.dayGroupTitle, { color: isToday ? theme.primary : theme.text, fontWeight: isToday ? "700" : "600" }]}>
            {itemDate} • {totalDayHours}h
          </ThemedText>
          {isToday && (
            <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
              <ThemedText style={[styles.todayBadgeText, { color: "#FFFFFF" }]}>Dnes</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.dayGroupContent}>
          {hours.map((hour: WorkHour) => {
            const isWork = hour.description.includes("Práce");
            const badgeColor = isWork ? theme.primary : theme.secondary;
            const icon = isWork ? "tool" : "book";
            const hasComment = !!hour.master_comment;

            return (
              <View key={hour.id} style={[styles.hourItem, { borderBottomColor: theme.border }]}>
                <View style={styles.hourLeft}>
                  <View style={[styles.hourBadge, { backgroundColor: badgeColor + "20" }]}>
                    <Feather name={icon} size={16} color={badgeColor} />
                    <ThemedText style={[styles.hourValue, { color: badgeColor }]}>{hour.hours}h</ThemedText>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <ThemedText style={[styles.hourDescription, { color: theme.textSecondary }]}>
                      {hour.description}
                    </ThemedText>
                    {hasComment && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="message-circle" size={12} color={theme.primary} />
                        <ThemedText style={{ fontSize: 12, color: theme.primary, fontStyle: 'italic' }}>
                          {hour.master_comment}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={() => startCommenting(hour)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 8 })}
                >
                  <Feather name="message-square" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (!selectedApprenticeData) {
    return <NoApprenticeSelected />;
  }

  return (
    <>
      <FlatList
        data={groupedHours}
        keyExtractor={(item: any) => `day-${item.date.getTime()}`}
        renderItem={DayGroupItem}
        contentContainerStyle={{
          paddingTop: Spacing.lg + 8,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: Spacing.lg }}>
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: Spacing.md,
              marginBottom: Spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}>
              <ThemedText style={{ ...Typography.label }}>Zobrazit celou historii</ThemedText>
              <Switch
                value={showAllHistory}
                onValueChange={setShowAllHistory}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={styles.header}>
              <ThemedText style={styles.title}>Přehled hodin</ThemedText>
              {selectedApprenticeData && (
                <ThemedText style={{ color: theme.textSecondary }}>{selectedApprenticeData.name}</ThemedText>
              )}
            </View>

            <View style={[styles.pickerPanel, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <View style={styles.pickersRow}>
                <SlotWheelPicker
                  data={weekData}
                  selectedValue={selectedWeek}
                  onValueChange={setSelectedWeek}
                  label="Tyden"
                />
                <SlotWheelPicker
                  data={monthData}
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  label="Mesic"
                />
                <SlotWheelPicker
                  data={yearData}
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  label="Rok"
                />
              </View>
            </View>

            <Pressable
              onPress={() => setTotalsPeriod(prev => prev === 'week' ? 'month' : prev === 'month' ? 'year' : 'week')}
              style={({ pressed }) => [
                styles.totalsPanel,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <ThemedText style={[styles.totalsPeriodLabel, { color: "#FF3B30", fontSize: 20 }]}>
                {getPeriodLabel()}
              </ThemedText>
              <View style={styles.totalsContent}>
                <View style={styles.totalsItem}>
                  <ThemedText style={[styles.totalsLabel, { color: theme.textSecondary }]}>
                    Práce
                  </ThemedText>
                  <ThemedText style={[styles.totalsValue, { color: theme.primary }]}>
                    {totalsPeriod === 'week' ? weekTotals.work : totalsPeriod === 'month' ? monthTotals.work : yearTotals.work}h
                  </ThemedText>
                </View>
                <View style={[styles.totalsDivider, { backgroundColor: theme.border }]} />
                <View style={styles.totalsItem}>
                  <ThemedText style={[styles.totalsLabel, { color: theme.textSecondary }]}>
                    Studium
                  </ThemedText>
                  <ThemedText style={[styles.totalsValue, { color: theme.secondary }]}>
                    {totalsPeriod === 'week' ? weekTotals.study : totalsPeriod === 'month' ? monthTotals.study : yearTotals.study}h
                  </ThemedText>
                </View>
                <View style={[styles.totalsDivider, { backgroundColor: theme.border }]} />
                <View style={styles.totalsItem}>
                  <ThemedText style={[styles.totalsLabel, { color: theme.textSecondary }]}>
                    Celkem
                  </ThemedText>
                  <ThemedText style={[styles.totalsValue, { color: theme.text }]}>
                    {totalsPeriod === 'week' ? weekTotals.total : totalsPeriod === 'month' ? monthTotals.total : yearTotals.total}h
                  </ThemedText>
                </View>
              </View>
            </Pressable>

            <View style={{ paddingHorizontal: Spacing.lg }}>
              <Pressable
                onPress={() => {
                  const today = new Date();
                  setSelectedYear(today.getFullYear());
                  setSelectedMonth(today.getMonth() + 1);
                  setSelectedWeek(getWeekNumber(today));
                  setSelectedDate(today);
                }}
                style={({ pressed }) => [
                  styles.todayButtonMain,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText style={[styles.todayButtonMainText, { color: "#FFFFFF" }]}>Dnes</ThemedText>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ThemedText style={{ color: theme.textSecondary }}>Žádné záznamy pro toto období</ThemedText>
          </View>
        }
      />

      {/* Comment Modal */}
      <Modal
        visible={commentingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentingId(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setCommentingId(null)}
        >
          <Pressable
            onPress={e => e.stopPropagation()}
            style={{ width: '90%', backgroundColor: theme.backgroundDefault, padding: Spacing.lg, borderRadius: BorderRadius.md }}
          >
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: Spacing.md }}>Komentář mistra</ThemedText>
            <TextInput
              style={{
                backgroundColor: theme.backgroundRoot,
                color: theme.text,
                padding: Spacing.md,
                borderRadius: BorderRadius.sm,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: Spacing.lg
              }}
              multiline
              placeholder="Napište poznámku k tomuto záznamu..."
              placeholderTextColor={theme.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <Pressable
                style={{ flex: 1, backgroundColor: theme.primary, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center' }}
                onPress={saveComment}
                disabled={isSavingComment}
              >
                <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>
                  {isSavingComment ? "Ukládání..." : "Uložit"}
                </ThemedText>
              </Pressable>
              <Pressable
                style={{ flex: 1, backgroundColor: theme.backgroundRoot, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center' }}
                onPress={() => setCommentingId(null)}
              >
                <ThemedText style={{ color: theme.text }}>Zrušit</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Alert Modal for Web */}
      {
        alertVisible && Platform.OS === 'web' && (
          <View style={styles.alertOverlay}>
            <View style={[styles.alertModal, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <ThemedText style={[styles.alertTitle, { color: theme.text }]}>{alertTitle}</ThemedText>
              <ThemedText style={[styles.alertMessage, { color: theme.textSecondary }]}>{alertMessage}</ThemedText>
              <Pressable
                onPress={() => setAlertVisible(false)}
                style={[styles.alertButton, { backgroundColor: theme.primary }]}
              >
                <ThemedText style={styles.alertButtonText}>OK</ThemedText>
              </Pressable>
            </View>
          </View>
        )
      }
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.h4,
  },
  pickerPanel: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  pickersRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  totalsPanel: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  totalsPeriodLabel: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  totalsContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  totalsItem: {
    flex: 1,
    alignItems: "center",
  },
  totalsLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  totalsValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  totalsDivider: {
    width: 1,
    height: 40,
  },
  dayGroupCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  dayGroupTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  dayGroupTitle: {
    ...Typography.body,
    fontWeight: "600",
    flex: 1,
  },
  todayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  todayBadgeText: {
    ...Typography.small,
    fontWeight: "700",
    fontSize: 11,
  },
  dayGroupContent: {
    paddingHorizontal: Spacing.md,
  },
  hourItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  hourLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  hourBadge: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  hourValue: {
    ...Typography.body,
    fontWeight: "700",
  },
  hourDescription: {
    ...Typography.small,
  },
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  alertModal: {
    width: '80%',
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertTitle: {
    ...Typography.title,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  alertMessage: {
    ...Typography.body,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  alertButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  todayButtonMain: {
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  todayButtonMainText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
