import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable, FlatList, TextInput, Alert, ActivityIndicator, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useData, AdminSettings } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import Slider from "@react-native-community/slider";
import { SlotWheelPicker } from "@/components/SlotWheelPicker";
import { api } from "@/services/api";
import { getInitials } from "@/utils/string";

interface WorkHour {
    id: number;
    timestamp: number;
    hours: number;
    description: string;
    master_comment?: string;
    master_id?: string | null;
}

const sanitizeWorkHours = (rawData: any): WorkHour[] => {
    if (!Array.isArray(rawData)) {
        return [];
    }

    return rawData.map((item, index) => {
        let safeId = typeof item?.id === 'number' ? item.id : parseInt(item?.id, 10);
        if (isNaN(safeId) || !isFinite(safeId)) {
            safeId = Date.now() + index;
        }

        let safeHours = parseFloat(item?.hours);
        if (isNaN(safeHours) || !isFinite(safeHours)) {
            safeHours = 0;
        }

        let safeTimestamp = typeof item?.timestamp === 'number' ? item.timestamp : parseInt(item?.timestamp, 10);
        if (isNaN(safeTimestamp) || !isFinite(safeTimestamp)) {
            safeTimestamp = Date.now();
        }

        return {
            id: safeId,
            hours: safeHours,
            timestamp: safeTimestamp,
            description: item?.description ? String(item.description) : "",
            master_comment: item?.master_comment || "",
            master_id: item?.master_id || null,
        };
    });
};

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

export default function HodinyXScreen() {
    const { theme } = useTheme();
    const insets = useScreenInsets();
    const { user } = useAuth();
    const { userData, adminSettings, addWorkHour, removeWorkHour, updateWorkHour, allUsers, userLimits } = useData();

    const today = new Date();
    const currentWeekNum = getWeekNumber(today);
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const [selectedWeek, setSelectedWeek] = useState(currentWeekNum);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const [workHoursInput, setWorkHoursInput] = useState(8);
    const [studyHoursInput, setStudyHoursInput] = useState(4);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [workDescription, setWorkDescription] = useState("");
    const [studyDescription, setStudyDescription] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingHours, setEditingHours] = useState(0);
    const [editingDescription, setEditingDescription] = useState("");
    const [editingTimestamp, setEditingTimestamp] = useState(0);
    const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
    const [totalsPeriod, setTotalsPeriod] = useState<'week' | 'month' | 'year'>('week');

    // REMOVED local userLimits state to use global context
    const [isLoadingLimits, setIsLoadingLimits] = useState(false);
    const [originalWorkHours, setOriginalWorkHours] = useState(0);
    const [originalStudyHours, setOriginalStudyHours] = useState(0);
    const [originalWorkDescription, setOriginalWorkDescription] = useState("");
    const [originalStudyDescription, setOriginalStudyDescription] = useState("");
    const [hasChanges, setHasChanges] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Live limit validation
    const [limitError, setLimitError] = useState<string | null>(null);

    // Custom alert state for web
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState("");
    const [alertMessage, setAlertMessage] = useState("");

    // Cross-platform alert function
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
            let isActive = true;

            const loadMasterApprenticeData = async () => {
                if (user?.role === "Mistr") {
                    try {
                        const rawString = await AsyncStorage.getItem("masterSelectedApprenticeData");
                        if (rawString && isActive) {
                            const parsed = JSON.parse(rawString);
                            const cleanWorkHours = sanitizeWorkHours(parsed?.workHours || []);

                            setSelectedApprenticeData({
                                ...parsed,
                                workHours: cleanWorkHours
                            });
                        }
                    } catch (e) {
                        console.error("Failed to load/parse apprentice data", e);
                    }
                }
            };

            loadMasterApprenticeData();

            return () => { isActive = false; };
        }, [user?.role])
    );

    const rawWorkHours = user?.role === "Mistr" && selectedApprenticeData
        ? selectedApprenticeData.workHours
        : userData.workHours;

    const workHours: WorkHour[] = useMemo(() => {
        return sanitizeWorkHours(rawWorkHours);
    }, [rawWorkHours]);

    useEffect(() => {
        const loadSliderPosition = async () => {
            try {
                const savedWork = await AsyncStorage.getItem("workHoursSliderPosition");
                const savedStudy = await AsyncStorage.getItem("studyHoursSliderPosition");
                if (savedWork) {
                    const parsed = parseFloat(savedWork);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        setWorkHoursInput(parsed);
                    }
                }
                if (savedStudy) {
                    const parsed = parseFloat(savedStudy);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        setStudyHoursInput(parsed);
                    }
                }
            } catch (error) {
                console.error("Error loading slider position:", error);
            }
        };
        loadSliderPosition();
    }, []);

    useEffect(() => {
        const saveSliderPosition = async () => {
            try {
                await AsyncStorage.setItem("workHoursSliderPosition", String(workHoursInput));
                await AsyncStorage.setItem("studyHoursSliderPosition", String(studyHoursInput));
            } catch (error) {
                console.error("Error saving slider position:", error);
            }
        };
        saveSliderPosition();
    }, [workHoursInput, studyHoursInput]);

    // EFFECT REMOVED: Relying on DataContext for limits
    // useEffect(() => { loadUserLimits... }, ...);

    useEffect(() => {
        const weekYear = getYearForWeek(selectedYear, selectedMonth, selectedWeek);
        const mondayOfSelectedWeek = getDateFromWeekNumber(weekYear, selectedWeek);
        setSelectedDate(mondayOfSelectedWeek);
    }, [selectedWeek, selectedYear, selectedMonth]);

    useEffect(() => {
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingWorkEntries = workHours
            .filter((h: WorkHour) => h.description.includes("Práce") && h.timestamp >= dayStart.getTime() && h.timestamp <= dayEnd.getTime() && h.master_id === userData.selectedMasterId);
        const existingWork = existingWorkEntries.reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
        const existingWorkDesc = existingWorkEntries.length > 0 ? existingWorkEntries[0].description.replace(/^Práce\s*-\s*/, "") : "";

        const existingStudyEntries = workHours
            .filter((h: WorkHour) => h.description.includes("Studium") && h.timestamp >= dayStart.getTime() && h.timestamp <= dayEnd.getTime() && h.master_id === userData.selectedMasterId);
        const existingStudy = existingStudyEntries.reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
        const existingStudyDesc = existingStudyEntries.length > 0 ? existingStudyEntries[0].description.replace(/^Studium\s*-\s*/, "") : "";

        setWorkHoursInput(existingWork);
        setStudyHoursInput(existingStudy);
        setWorkDescription(existingWorkDesc);
        setStudyDescription(existingStudyDesc);
        setOriginalWorkHours(existingWork);
        setOriginalStudyHours(existingStudy);
        setOriginalWorkDescription(existingWorkDesc);
        setOriginalStudyDescription(existingStudyDesc);
        setHasChanges(false);
    }, [selectedDate, workHours, userData.selectedMasterId]);

    useEffect(() => {
        const workHoursChanged = workHoursInput !== originalWorkHours;
        const studyHoursChanged = studyHoursInput !== originalStudyHours;
        const workDescChanged = workDescription.trim() !== originalWorkDescription.trim();
        const studyDescChanged = studyDescription.trim() !== originalStudyDescription.trim();
        setHasChanges(workHoursChanged || studyHoursChanged || workDescChanged || studyDescChanged);
    }, [workHoursInput, studyHoursInput, workDescription, studyDescription, originalWorkHours, originalStudyHours, originalWorkDescription, originalStudyDescription]);

    const getYearForWeek = (baseYear: number, month: number, weekNum: number): number => {
        if (month === 12 && weekNum <= 5) {
            return baseYear + 1;
        }
        if (month === 1 && weekNum >= 48) {
            return baseYear - 1;
        }
        return baseYear;
    };

    const getWeeksInMonth = (year: number, month: number): number[] => {
        const weeks: Set<number> = new Set();
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            const weekNum = getWeekNumber(new Date(d));
            weeks.add(weekNum);
        }

        const weeksArray = Array.from(weeks);
        const hasHighWeeks = weeksArray.some(w => w >= 48);
        const hasLowWeeks = weeksArray.some(w => w <= 5);
        const hasYearBoundary = hasHighWeeks && hasLowWeeks;

        return weeksArray.sort((a, b) => {
            if (hasYearBoundary) {
                if (a >= 48 && b <= 5) return -1;
                if (b >= 48 && a <= 5) return 1;
            }
            return a - b;
        });
    };

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

    useEffect(() => {
        const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth);
        if (!weeksInMonth.includes(selectedWeek)) {
            setSelectedWeek(weeksInMonth[0] || 1);
        }
    }, [selectedYear, selectedMonth]);

    const monthData = useMemo(() => {
        const monthNames = ["Led", "Uno", "Bre", "Dub", "Kve", "Cer", "Crv", "Srp", "Zar", "Rij", "Lis", "Pro"];
        return monthNames.map((name, idx) => ({ value: idx + 1, label: name }));
    }, []);

    const yearData = useMemo(() => {
        const years = [];
        for (let y = currentYear - 5; y <= currentYear + 1; y++) {
            years.push({ value: y, label: String(y) });
        }
        return years;
    }, [currentYear]);

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

    const calculateTotalsForRange = (startDate: Date, endDate: Date) => {
        const work = workHours
            .filter((h: WorkHour) => h.description.includes("Práce") && isDateInRange(h.timestamp, startDate, endDate) && (!userData.selectedMasterId || h.master_id === userData.selectedMasterId))
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
        const study = workHours
            .filter((h: WorkHour) => h.description.includes("Studium") && isDateInRange(h.timestamp, startDate, endDate) && (!userData.selectedMasterId || h.master_id === userData.selectedMasterId))
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
        return { work, study, total: work + study };
    };

    const weekTotals = useMemo(() => {
        const weekYear = getYearForWeek(selectedYear, selectedMonth, selectedWeek);
        const { startDate, endDate } = getDateRangeForWeek(weekYear, selectedWeek);
        return calculateTotalsForRange(startDate, endDate);
    }, [selectedYear, selectedMonth, selectedWeek, workHours, userData.selectedMasterId]);

    const monthTotals = useMemo(() => {
        const { startDate, endDate } = getDateRangeForMonth(selectedYear, selectedMonth);
        return calculateTotalsForRange(startDate, endDate);
    }, [selectedYear, selectedMonth, workHours, userData.selectedMasterId]);

    const yearTotals = useMemo(() => {
        const { startDate, endDate } = getDateRangeForYear(selectedYear);
        return calculateTotalsForRange(startDate, endDate);
    }, [selectedYear, workHours, userData.selectedMasterId]);

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
            .filter((h: WorkHour) => (!userData.selectedMasterId || h.master_id === userData.selectedMasterId) && isDateInRange(h.timestamp, startDate, endDate))
            .sort((a: WorkHour, b: WorkHour) => a.timestamp - b.timestamp);

        const groupedByDate = filteredWorkHours.reduce((acc: Record<string, { date: Date; masterGroups: Record<string, WorkHour[]> }>, hour: WorkHour) => {
            const date = new Date(hour.timestamp);
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            if (!acc[dateKey]) {
                acc[dateKey] = { date, masterGroups: {} };
            }
            const masterId = hour.master_id || 'no-master';
            if (!acc[dateKey].masterGroups[masterId]) {
                acc[dateKey].masterGroups[masterId] = [];
            }
            acc[dateKey].masterGroups[masterId].push(hour);
            return acc;
        }, {});

        // Sort hours within each master group: Work first, then Study
        Object.values(groupedByDate).forEach(dayGroup => {
            Object.values(dayGroup.masterGroups).forEach(masterHours => {
                masterHours.sort((a: WorkHour, b: WorkHour) => {
                    const aIsWork = a.description.includes("Práce");
                    const bIsWork = b.description.includes("Práce");
                    if (aIsWork && !bIsWork) return -1;
                    if (!aIsWork && bIsWork) return 1;
                    return 0;
                });
            });
        });

        return Object.values(groupedByDate);
    }, [workHours, startDate, endDate, userData.selectedMasterId]);

    const dayNames = ["Po", "Ut", "St", "Ct", "Pa", "So", "Ne"];

    const getWeekDays = () => {
        const days = [];
        const weekYear = getYearForWeek(selectedYear, selectedMonth, selectedWeek);
        const monday = getDateFromWeekNumber(weekYear, selectedWeek);

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            days.push(date);
        }
        return days;
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const getHoursForDay = (day: Date) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const work = workHours
            .filter((h: WorkHour) => h.description.includes("Práce") && isDateInRange(h.timestamp, dayStart, dayEnd) && (!userData.selectedMasterId || h.master_id === userData.selectedMasterId))
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);

        const study = workHours
            .filter((h: WorkHour) => h.description.includes("Studium") && isDateInRange(h.timestamp, dayStart, dayEnd) && (!userData.selectedMasterId || h.master_id === userData.selectedMasterId))
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);

        return { work, study };
    };

    const hasWorkRecordForDate = (date: Date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return workHours.some((h: WorkHour) =>
            h.description.includes("Práce") &&
            isDateInRange(h.timestamp, dayStart, dayEnd) &&
            (!userData.selectedMasterId || h.master_id === userData.selectedMasterId)
        );
    };

    const hasStudyRecordForDate = (date: Date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return workHours.some((h: WorkHour) =>
            h.description.includes("Studium") &&
            isDateInRange(h.timestamp, dayStart, dayEnd) &&
            (!userData.selectedMasterId || h.master_id === userData.selectedMasterId)
        );
    };

    const getDayHoursSum = (date: Date, type: "Práce" | "Studium") => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return workHours
            .filter((h: WorkHour) => h.description.includes(type) && isDateInRange(h.timestamp, dayStart, dayEnd) && (!userData.selectedMasterId || h.master_id === userData.selectedMasterId))
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
    };

    const getWeekHoursSum = (date: Date, type: "Práce" | "Studium") => {
        const weekStart = getDateFromWeekNumber(date.getFullYear(), getWeekNumber(date));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return workHours
            .filter((h: WorkHour) => h.description.includes(type) && isDateInRange(h.timestamp, weekStart, weekEnd) && (!userData.selectedMasterId || h.master_id === userData.selectedMasterId))
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
    };

    const getMonthHoursSum = (date: Date, type: "Práce" | "Studium") => {
        const targetYear = date.getFullYear();
        const targetMonth = date.getMonth();
        return workHours
            .filter((h: WorkHour) => {
                const hDate = new Date(h.timestamp);
                return h.description.includes(type) &&
                    hDate.getFullYear() === targetYear &&
                    hDate.getMonth() === targetMonth &&
                    (!userData.selectedMasterId || h.master_id === userData.selectedMasterId);
            })
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
    };

    const getYearHoursSum = (date: Date, type: "Práce" | "Studium") => {
        const targetYear = date.getFullYear();
        return workHours
            .filter((h: WorkHour) => {
                const hDate = new Date(h.timestamp);
                return h.description.includes(type) && hDate.getFullYear() === targetYear && (!userData.selectedMasterId || h.master_id === userData.selectedMasterId);
            })
            .reduce((sum: number, h: WorkHour) => sum + (isNaN(h.hours) ? 0 : h.hours), 0);
    };

    const getExistingEntriesForDay = (date: Date, type: "Práce" | "Studium"): WorkHour[] => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return workHours.filter((h: WorkHour) =>
            h.description.includes(type) &&
            h.timestamp >= dayStart.getTime() &&
            h.timestamp <= dayEnd.getTime() &&
            h.master_id === userData.selectedMasterId
        );
    };


    // Use globalUserLimits if viewing self, or handle apprentice logic if needed. 
    // Note: For now assuming simplified context usage. If Master is viewing Apprentice, DataContext userLimits might be HIS limits? 
    // Actually DataContext follows current auth user. If Master views Apprentice, we might need to fetch THAT apprentice's limits.
    // But the previous code fetched based on selectedApprenticeData.id. 
    const checkLimitsForUpdate = (type: "Práce" | "Studium", newHours: number, existingHours: number, dateToCheck?: Date): { ok: boolean; message: string } => {
        if (isLoadingLimits) {
            return { ok: false, message: "Nacitaji se limity, prosim pockejte" };
        }

        const isViewingApprentice = user?.role === "Mistr" && selectedApprenticeData;
        const limits = isViewingApprentice ? (selectedApprenticeData.userLimits || adminSettings) : (userLimits ?? adminSettings);

        // Use effective limits
        const effectiveLimits = limits;
        const isWork = type === "Práce";
        const dayLimit = (isWork ? effectiveLimits?.max_work_hours_day : effectiveLimits?.max_study_hours_day) ?? (isWork ? 8 : 4);
        const weekLimit = (isWork ? effectiveLimits?.max_work_hours_week : effectiveLimits?.max_study_hours_week) ?? (isWork ? 40 : 20);
        const monthLimit = (isWork ? effectiveLimits?.max_work_hours_month : effectiveLimits?.max_study_hours_month) ?? (isWork ? 160 : 80);
        const yearLimit = (isWork ? effectiveLimits?.max_work_hours_year : effectiveLimits?.max_study_hours_year) ?? (isWork ? 1920 : 960);

        const hoursDifference = newHours - existingHours;

        // Use provided date or fall back to selectedDate
        const targetDate = dateToCheck || selectedDate;

        const currentDaySum = getDayHoursSum(targetDate, type);
        const currentWeekSum = getWeekHoursSum(targetDate, type);
        const currentMonthSum = getMonthHoursSum(targetDate, type);
        const currentYearSum = getYearHoursSum(targetDate, type);

        if (currentDaySum + hoursDifference > dayLimit) {
            return { ok: false, message: `Prekrocen denni limit ${dayLimit}h pro ${type.toLowerCase()}` };
        }
        if (currentWeekSum + hoursDifference > weekLimit) {
            return { ok: false, message: `Prekrocen tydenni limit ${weekLimit}h pro ${type.toLowerCase()}` };
        }
        if (currentMonthSum + hoursDifference > monthLimit) {
            return { ok: false, message: `Prekrocen mesicni limit ${monthLimit}h pro ${type.toLowerCase()}` };
        }
        if (currentYearSum + hoursDifference > yearLimit) {
            return { ok: false, message: `Prekrocen rocni limit ${yearLimit}h pro ${type.toLowerCase()}` };
        }
        return { ok: true, message: "" };
    };

    // Check limits live when sliders change
    useEffect(() => {
        if (isLoadingLimits) {
            setLimitError(null);
            return;
        }

        const workHoursChanged = Math.abs(workHoursInput - originalWorkHours) > 0.01;
        const studyHoursChanged = Math.abs(studyHoursInput - originalStudyHours) > 0.01;
        const workDescChanged = workDescription.trim() !== originalWorkDescription.trim();
        const studyDescChanged = studyDescription.trim() !== originalStudyDescription.trim();

        // Only check if something changed
        if (!workHoursChanged && !studyHoursChanged && !workDescChanged && !studyDescChanged) {
            setLimitError(null);
            return;
        }

        // Check work limits if work changed
        if (workHoursChanged || workDescChanged) {
            const checkWork = checkLimitsForUpdate("Práce", workHoursInput, originalWorkHours);
            if (!checkWork.ok) {
                setLimitError(checkWork.message);
                return;
            }
        }

        // Check study limits if study changed
        if (studyHoursChanged || studyDescChanged) {
            const checkStudy = checkLimitsForUpdate("Studium", studyHoursInput, originalStudyHours);
            if (!checkStudy.ok) {
                setLimitError(checkStudy.message);
                return;
            }
        }

        setLimitError(null);
    }, [workHoursInput, studyHoursInput, workDescription, studyDescription, originalWorkHours, originalStudyHours, originalWorkDescription, originalStudyDescription, isLoadingLimits]);

    const handleAddBoth = async () => {
        if (isAdding) return;
        setIsAdding(true);

        try {
            const timestamp = selectedDate.getTime();
            let hasError = false;

            const existingWorkEntries = getExistingEntriesForDay(selectedDate, "Práce");
            const existingStudyEntries = getExistingEntriesForDay(selectedDate, "Studium");

            const workChanged = Math.abs(workHoursInput - originalWorkHours) > 0.01;
            const studyChanged = Math.abs(studyHoursInput - originalStudyHours) > 0.01;
            const workDescChanged = workDescription.trim() !== originalWorkDescription.trim();
            const studyDescChanged = studyDescription.trim() !== originalStudyDescription.trim();

            if (workChanged || workDescChanged) {
                const checkWork = checkLimitsForUpdate("Práce", workHoursInput, originalWorkHours);
                if (!checkWork.ok) {
                    showAlert("Limit prekrocen", checkWork.message);
                    hasError = true;
                } else {
                    if (workHoursInput === 0 && !workDescription.trim()) {
                        if (existingWorkEntries.length > 0) {
                            for (const entry of existingWorkEntries) {
                                await removeWorkHour(entry.id);
                            }
                        }
                    } else {
                        const fullDescriptionWork = workDescription.trim() ? `Práce - ${workDescription}` : "Práce";

                        if (existingWorkEntries.length > 0) {
                            // Update first entry to preserve comment
                            const firstEntry = existingWorkEntries[0];
                            await updateWorkHour(firstEntry.id, {
                                timestamp,
                                hours: workHoursInput,
                                description: fullDescriptionWork,
                            });

                            // Remove other entries if any
                            for (let i = 1; i < existingWorkEntries.length; i++) {
                                await removeWorkHour(existingWorkEntries[i].id);
                            }
                        } else {
                            // Create new
                            await addWorkHour({
                                timestamp,
                                hours: workHoursInput,
                                description: fullDescriptionWork,
                            });
                        }
                    }
                }
            }

            if (!hasError && (studyChanged || studyDescChanged)) {
                const checkStudy = checkLimitsForUpdate("Studium", studyHoursInput, originalStudyHours);
                if (!checkStudy.ok) {
                    showAlert("Limit prekrocen", checkStudy.message);
                    hasError = true;
                } else {
                    if (studyHoursInput === 0 && !studyDescription.trim()) {
                        if (existingStudyEntries.length > 0) {
                            for (const entry of existingStudyEntries) {
                                await removeWorkHour(entry.id);
                            }
                        }
                    } else {
                        const fullDescriptionStudy = studyDescription.trim() ? `Studium - ${studyDescription}` : "Studium";

                        if (existingStudyEntries.length > 0) {
                            // Update first entry to preserve comment
                            const firstEntry = existingStudyEntries[0];
                            await updateWorkHour(firstEntry.id, {
                                timestamp,
                                hours: studyHoursInput,
                                description: fullDescriptionStudy,
                            });

                            // Remove other entries if any
                            for (let i = 1; i < existingStudyEntries.length; i++) {
                                await removeWorkHour(existingStudyEntries[i].id);
                            }
                        } else {
                            // Create new
                            await addWorkHour({
                                timestamp,
                                hours: studyHoursInput,
                                description: fullDescriptionStudy,
                            });
                        }
                    }
                }
            }

            if (!hasError) {
                setOriginalWorkHours(workHoursInput);
                setOriginalStudyHours(studyHoursInput);
                setOriginalWorkDescription(workDescription);
                setOriginalStudyDescription(studyDescription);
                setHasChanges(false);
            }
        } catch (error) {
            console.error("Chyba pri ukladani hodin:", error);
            showAlert("Chyba", "Nepodarilo se ulozit hodiny");
        } finally {
            setIsAdding(false);
        }
    };

    const shortenLimitError = (error: string): string => {
        // Parse the error message and create short version
        // Format: "Prekrocen denni limit 8h pro práci" -> "max 8h denně - práce"
        const match = error.match(/(denni|tydenni|mesicni|rocni) limit (\d+)h pro (.*)/);
        if (!match) return error;

        const [, period, limit, type] = match;
        const periodMap: { [key: string]: string } = {
            'denni': 'denně',
            'tydenni': 'týdně',
            'mesicni': 'měsíčně',
            'rocni': 'ročně',
        };

        return `max ${limit}h ${periodMap[period]} - ${type}`;
    };

    const formatHistoryDate = (date: Date) => {
        const dayName = ["Nedele", "Pondeli", "Utery", "Streda", "Ctvrtek", "Patek", "Sobota"][date.getDay()];
        return `${dayName} ${date.getDate()}.${date.getMonth() + 1}.`;
    };

    const startEdit = (hour: WorkHour) => {
        setEditingId(hour.id);
        setEditingHours(hour.hours);
        setEditingDescription(hour.description);
        setEditingTimestamp(hour.timestamp);
    };

    const saveEdit = () => {
        if (editingId) {
            // Find the original entry to get original hours
            const originalEntry = workHours.find((h: WorkHour) => h.id === editingId);
            if (!originalEntry) {
                setEditingId(null);
                return;
            }

            // Determine if it's work or study
            const isWork = editingDescription.includes("Práce");
            const type: "Práce" | "Studium" = isWork ? "Práce" : "Studium";

            // Get the date of this entry for limit checking
            const entryDate = new Date(editingTimestamp);
            const originalHours = originalEntry.hours;

            // Check limits
            const checkResult = checkLimitsForUpdate(type, editingHours, originalHours, entryDate);

            if (!checkResult.ok) {
                showAlert("Limit překročen", checkResult.message);
                return;
            }

            // If limits are OK, update
            updateWorkHour(editingId, {
                timestamp: editingTimestamp,
                hours: editingHours,
                description: editingDescription,
                master_comment: originalEntry.master_comment,
            });
            setEditingId(null);
        }
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

    const handleGoToToday = () => {
        const today = new Date();
        setSelectedYear(today.getFullYear());
        setSelectedMonth(today.getMonth() + 1);
        setSelectedWeek(getWeekNumber(today));
        setSelectedDate(today);
    };

    const DayGroupItem = ({ item }: any) => {
        const dayDate = item.date;
        const masterGroups = item.masterGroups;
        const itemDate = formatHistoryDate(dayDate);

        // Calculate total hours for the day across all masters
        const totalDayHours = Object.values(masterGroups).reduce((sum: number, hours: any) => {
            return sum + hours.reduce((s: number, h: WorkHour) => s + (h.hours || 0), 0);
        }, 0);

        const today = new Date();
        const isToday = dayDate.getFullYear() === today.getFullYear() &&
            dayDate.getMonth() === today.getMonth() &&
            dayDate.getDate() === today.getDate();

        return (
            <View style={[styles.dayGroupCard, {
                backgroundColor: theme.backgroundDefault,
                borderColor: isToday ? theme.error : theme.border,
                borderWidth: isToday ? 2 : 1,
            }]}>
                <View style={[styles.dayGroupTitleRow, { borderBottomColor: theme.border }]}>
                    <ThemedText style={[styles.dayGroupTitle, { color: theme.text, fontWeight: "600" }]}>
                        {itemDate} • {totalDayHours}h
                    </ThemedText>
                    {isToday ? (
                        <View style={[styles.todayBadge, { backgroundColor: theme.error }]}>
                            <ThemedText style={[styles.todayBadgeText, { color: "#FFFFFF" }]}>Dnes</ThemedText>
                        </View>
                    ) : null}
                </View>
                <View style={styles.dayGroupContent}>
                    {Object.entries(masterGroups).map(([masterId, hours]: [string, any]) => {

                        return (
                            <View key={masterId}>
                                {/* Hours for this master */}
                                {hours.map((hour: WorkHour) => {
                                    const isWork = hour.description.includes("Práce");
                                    const badgeColor = isWork ? theme.primary : theme.secondary;
                                    const icon = isWork ? "tool" : "book";
                                    const isEditing = editingId === hour.id;

                                    if (isEditing) {
                                        return (
                                            <View key={hour.id} style={[styles.hourItem, { borderBottomColor: theme.border, paddingVertical: Spacing.md }]}>
                                                <View style={{ flex: 1, gap: Spacing.md }}>
                                                    <View style={styles.editSlider}>
                                                        <Slider
                                                            style={{ flex: 1 }}
                                                            minimumValue={0.5}
                                                            maximumValue={isWork
                                                                ? (userLimits?.max_work_hours_day ?? adminSettings.max_work_hours_day ?? 12)
                                                                : (userLimits?.max_study_hours_day ?? adminSettings.max_study_hours_day ?? 12)}
                                                            step={0.5}
                                                            value={editingHours}
                                                            onValueChange={setEditingHours}
                                                            minimumTrackTintColor={badgeColor}
                                                            maximumTrackTintColor={theme.border}
                                                            thumbTintColor={badgeColor}
                                                        />
                                                        <ThemedText style={{ color: badgeColor, fontWeight: "700", minWidth: 35 }}>
                                                            {Math.round(editingHours * 2) / 2}h
                                                        </ThemedText>
                                                    </View>
                                                    <TextInput
                                                        style={[styles.editInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                                                        value={editingDescription}
                                                        onChangeText={setEditingDescription}
                                                        placeholder="Popis"
                                                        placeholderTextColor={theme.textSecondary}
                                                    />
                                                    <View style={styles.editButtons}>
                                                        <Pressable
                                                            onPress={saveEdit}
                                                            style={({ pressed }) => [styles.editButton, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}
                                                        >
                                                            <Feather name="check" size={16} color="#FFFFFF" />
                                                            <ThemedText style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>Ulozit</ThemedText>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => setEditingId(null)}
                                                            style={({ pressed }) => [styles.editButton, { backgroundColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
                                                        >
                                                            <Feather name="x" size={16} color={theme.text} />
                                                            <ThemedText style={{ color: theme.text, marginLeft: Spacing.xs }}>Zrusit</ThemedText>
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    }

                                    return (
                                        <Pressable
                                            key={hour.id}
                                            onPress={() => startEdit(hour)}
                                            style={({ pressed }) => [
                                                styles.hourItem,
                                                { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
                                            ]}
                                        >
                                            <View style={styles.hourLeft}>
                                                <View style={[styles.hourBadge, { backgroundColor: badgeColor + "20" }]}>
                                                    <Feather name={icon as any} size={16} color={badgeColor} />
                                                    <ThemedText style={[styles.hourValue, { color: badgeColor }]}>{hour.hours}h</ThemedText>
                                                </View>
                                                {hour.master_id && (
                                                    <View style={[styles.initialsBadge, { borderColor: theme.textSecondary }]}>
                                                        <ThemedText style={[styles.initialsText, { color: theme.textSecondary }]}>
                                                            {getInitials(allUsers.find(u => u.id === hour.master_id)?.name || "")}
                                                        </ThemedText>
                                                    </View>
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    <ThemedText style={[styles.hourDescription, { color: theme.textSecondary }]}>
                                                        {hour.description}
                                                    </ThemedText>
                                                    {!!hour.master_comment && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                            <Feather name="message-circle" size={12} color={theme.primary} />
                                                            <ThemedText style={{ fontSize: 12, color: theme.primary, fontStyle: 'italic' }}>
                                                                {hour.master_comment}
                                                            </ThemedText>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            <Pressable
                                                onPress={() => removeWorkHour(hour.id)}
                                                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                                            >
                                                <Feather name="trash-2" size={18} color={theme.error} />
                                            </Pressable>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        );
                    })}
                </View>
            </View >
        );
    };

    return (
        <>
            <FlatList
                data={groupedHours}
                keyExtractor={(item) => `day-${item.date.getFullYear()}-${item.date.getMonth()}-${item.date.getDate()}`}
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

                        <View style={[styles.addPanel, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                            <View style={styles.dateSelector}>
                                {getWeekDays().map((day, idx) => {
                                    const isSelected = isSameDay(day, selectedDate);
                                    const { work, study } = getHoursForDay(day);
                                    const isInSelectedMonth = day.getMonth() + 1 === selectedMonth && day.getFullYear() === selectedYear;
                                    const isFirstOfMonth = day.getDate() === 1;
                                    const dayLabel = isFirstOfMonth ? `${day.getDate()}.${day.getMonth() + 1}` : `${day.getDate()}`;
                                    const today = new Date();
                                    const isToday = isSameDay(day, today);
                                    return (
                                        <View key={idx} style={[styles.dayWrapper, !isInSelectedMonth && { opacity: 0.4 }]}>
                                            <Pressable
                                                onPress={() => setSelectedDate(day)}
                                                style={({ pressed }) => [
                                                    styles.dayButton,
                                                    {
                                                        backgroundColor: isSelected ? theme.primary : "transparent",
                                                        opacity: pressed ? 0.7 : 1,
                                                        borderColor: isToday ? theme.error : theme.border,
                                                        borderWidth: isToday ? 2 : 1,
                                                    },
                                                ]}
                                            >
                                                <ThemedText style={[styles.dayButtonText, { color: isSelected ? "#FFFFFF" : theme.text }]}>
                                                    {dayNames[idx]}
                                                </ThemedText>
                                                <ThemedText style={[styles.dayNumber, { color: isSelected ? "#FFFFFF" : theme.textSecondary }]}>
                                                    {dayLabel}
                                                </ThemedText>
                                            </Pressable>
                                            {(work > 0 || study > 0) ? (
                                                <View style={styles.dayHoursContainer}>
                                                    {work > 0 ? (
                                                        <ThemedText style={[styles.dayHours, { color: theme.primary }]}>{work}h</ThemedText>
                                                    ) : null}
                                                    {study > 0 ? (
                                                        <ThemedText style={[styles.dayHours, { color: theme.secondary }]}>{study}h</ThemedText>
                                                    ) : null}
                                                    {(work > 0 && study > 0) ? (
                                                        <ThemedText style={[styles.dayHours, { color: theme.text, opacity: 0.7, marginTop: 2 }]}>
                                                            {Math.round((work + study) * 2) / 2}h
                                                        </ThemedText>
                                                    ) : null}
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>

                            <Pressable
                                onPress={handleGoToToday}
                                style={({ pressed }) => [
                                    styles.todayButtonMain,
                                    { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                                ]}
                            >
                                <ThemedText style={[styles.todayButtonMainText, { color: "#FFFFFF" }]}>Dnes</ThemedText>
                            </Pressable>

                            <View style={styles.sliderContainer}>
                                <View style={styles.sliderLabelRow}>
                                    <Feather name="tool" size={16} color={theme.primary} />
                                    <ThemedText style={[styles.sliderLabel, { color: theme.primary }]}>Prace:</ThemedText>
                                </View>
                                <View style={styles.sliderWrapper}>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={0}
                                        maximumValue={userLimits?.max_work_hours_day ?? adminSettings.max_work_hours_day ?? 8}
                                        step={0.5}
                                        value={workHoursInput}
                                        onValueChange={setWorkHoursInput}
                                        minimumTrackTintColor={theme.primary}
                                        maximumTrackTintColor={theme.border}
                                        thumbTintColor={theme.primary}
                                    />
                                    <ThemedText style={[styles.hoursDisplay, { color: theme.primary }]}>
                                        {Math.round(workHoursInput * 2) / 2}h
                                    </ThemedText>
                                </View>
                                <TextInput
                                    style={[
                                        styles.descriptionInput,
                                        { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text },
                                    ]}
                                    placeholder="Napr. Oprava auta, montaz skrine..."
                                    placeholderTextColor={theme.textSecondary}
                                    value={workDescription}
                                    onChangeText={setWorkDescription}
                                    multiline
                                />
                            </View>

                            <View style={styles.sliderContainer}>
                                <View style={styles.sliderLabelRow}>
                                    <Feather name="book" size={16} color={theme.secondary} />
                                    <ThemedText style={[styles.sliderLabel, { color: theme.secondary }]}>Studium:</ThemedText>
                                </View>
                                <View style={styles.sliderWrapper}>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={0}
                                        maximumValue={userLimits?.max_study_hours_day ?? adminSettings.max_study_hours_day ?? 4}
                                        step={0.5}
                                        value={studyHoursInput}
                                        onValueChange={setStudyHoursInput}
                                        minimumTrackTintColor={theme.secondary}
                                        maximumTrackTintColor={theme.border}
                                        thumbTintColor={theme.secondary}
                                    />
                                    <ThemedText style={[styles.hoursDisplay, { color: theme.secondary }]}>
                                        {Math.round(studyHoursInput * 2) / 2}h
                                    </ThemedText>
                                </View>
                                <TextInput
                                    style={[
                                        styles.descriptionInput,
                                        { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text },
                                    ]}
                                    placeholder="Napr. Cteni prirucky, online kurz..."
                                    placeholderTextColor={theme.textSecondary}
                                    value={studyDescription}
                                    onChangeText={setStudyDescription}
                                    multiline
                                />
                            </View>

                            <Pressable
                                onPress={handleAddBoth}
                                disabled={!hasChanges || isAdding || !!limitError || !userData.selectedMasterId}
                                style={({ pressed }) => [
                                    styles.addButton,
                                    {
                                        backgroundColor: !userData.selectedMasterId ? theme.border : limitError ? theme.error : (!hasChanges || isAdding) ? theme.border : theme.success,
                                        opacity: (!hasChanges || isAdding || limitError || !userData.selectedMasterId) ? 0.5 : pressed ? 0.8 : 1,
                                    },
                                ]}
                            >
                                {isAdding ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : !userData.selectedMasterId ? (
                                    <ThemedText style={[styles.buttonText, { color: theme.textSecondary }]}>Vyber mistra</ThemedText>
                                ) : limitError ? (
                                    <ThemedText style={[styles.buttonText, { color: "#FFFFFF" }]}>{limitError}</ThemedText>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                        <ThemedText style={[styles.buttonText, { color: "#FFFFFF" }]}>
                                            {(originalWorkHours > 0 || originalStudyHours > 0) ? "Upravit záznam" : "Přidat záznam"}
                                        </ThemedText>
                                        {(workHoursInput > 0 || studyHoursInput > 0) && (
                                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }}>
                                                <ThemedText style={[styles.buttonText, { color: "#FFFFFF" }]}>
                                                    {workHoursInput + studyHoursInput}h
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Pressable>
                        </View>

                        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Historie</ThemedText>
                    </View >
                }
            />

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
    pickerPanel: {
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    pickerTitle: {
        ...Typography.body,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: Spacing.md,
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
    addPanel: {
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    dateSelector: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: Spacing.lg,
    },
    dayWrapper: {
        alignItems: "center",
    },
    dayButton: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        width: 40,
        height: 56,
        marginBottom: Spacing.xs,
    },
    dayButtonText: {
        ...Typography.small,
        fontWeight: "600",
    },
    dayNumber: {
        ...Typography.small,
    },
    dayHoursContainer: {
        flexDirection: "column",
        alignItems: "center",
    },
    dayHours: {
        fontSize: 10,
        fontWeight: "600",
        lineHeight: 12,
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
    sliderContainer: {
        marginBottom: Spacing.md,
    },
    sliderLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    sliderLabel: {
        ...Typography.small,
        fontWeight: "600",
    },
    sliderWrapper: {
        flexDirection: "row",
        alignItems: "center",
    },
    slider: {
        flex: 1,
        height: 40,
    },
    hoursDisplay: {
        ...Typography.h4,
        fontWeight: "700",
        minWidth: 55,
        textAlign: "right",
    },
    descriptionContainer: {
        marginBottom: Spacing.md,
    },
    descriptionLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    descriptionLabel: {
        ...Typography.small,
        fontWeight: "600",
    },
    descriptionInput: {
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        padding: Spacing.md,
        minHeight: 60,
        textAlignVertical: "top",
    },
    buttonsContainer: {
        flexDirection: "row",
        gap: Spacing.md,
    },
    button: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: BorderRadius.sm,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    workButton: {},
    studyButton: {},
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: BorderRadius.sm,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    buttonText: {
        ...Typography.body,
        fontWeight: "600",
    },
    sectionTitle: {
        ...Typography.body,
        fontWeight: "600",
        marginBottom: Spacing.md,
    },
    dayGroupCard: {
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.md,
        overflow: "hidden",
    },
    dayGroupTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
    },
    dayGroupTitle: {
        ...Typography.body,
    },
    todayBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.xs,
    },
    todayBadgeText: {
        ...Typography.small,
        fontWeight: "600",
    },
    dayGroupContent: {
        paddingHorizontal: Spacing.md,
    },
    hourItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
    },
    hourLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    hourBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.xs,
        gap: Spacing.xs,
        minWidth: 60,
    },
    hourValue: {
        ...Typography.body,
        fontWeight: "600",
    },
    hourDescription: {
        ...Typography.small,
    },
    editSlider: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    editHoursValue: {
        ...Typography.body,
        fontWeight: "600",
        width: 40,
        textAlign: "right",
    },
    editInput: {
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        padding: Spacing.sm,
    },
    editButtons: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
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
    hourMasterBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: Spacing.xs,
        marginRight: Spacing.xs,
    },
    hourMasterBadgeText: {
        fontSize: 8,
        fontWeight: "800",
    },
    initialsBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        justifyContent: "center",
        alignItems: "center",
    },
    initialsText: {
        fontSize: 9,
        fontWeight: "700",
        textAlign: "center",
        textAlignVertical: "center",
        includeFontPadding: false,
        lineHeight: 12,
    },
});
