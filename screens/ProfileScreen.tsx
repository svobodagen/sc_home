import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Modal, TextInput, FlatList, Animated, Keyboard, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData, ApprenticeGoals } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import { useMaster } from "@/contexts/MasterContext";
import { ApprenticeHeaderTitle } from "@/components/ApprenticeHeaderTitle";
import { getInitials } from "@/utils/string";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";

export default function ProfileScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, getAllUsers } = useAuth();
  const navigation = useNavigation<any>();
  const { userData, setSelectedMaster, setWeeklyGoal, setApprenticeLevel, getTotalHours, deleteAllWorkHours, deleteAllProjects, apprenticeGoals, saveApprenticeGoals, reloadApprenticeGoals, adminSettings, userLimits, allUsers } = useData();
  const { apprentices: masterApprentices, removeApprentice } = useMaster();
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [deleteHoursModalVisible, setDeleteHoursModalVisible] = useState(false);
  const [deleteProjectsModalVisible, setDeleteProjectsModalVisible] = useState(false);
  const [apprenticeModalVisible, setApprenticeModalVisible] = useState(false);
  const [selectApprenticeModalVisible, setSelectApprenticeModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [workGoal, setWorkGoal] = useState(String(userData.weeklyGoal.work));
  const [studyGoal, setStudyGoal] = useState(String(userData.weeklyGoal.study));
  const [goalPeriod, setGoalPeriod] = useState<"week" | "month" | "year">("week");
  const [workGoalWeek, setWorkGoalWeek] = useState(String(apprenticeGoals?.work_goal_week ?? 20));
  const [studyGoalWeek, setStudyGoalWeek] = useState(String(apprenticeGoals?.study_goal_week ?? 10));
  const [workGoalMonth, setWorkGoalMonth] = useState(String(apprenticeGoals?.work_goal_month ?? 80));
  const [studyGoalMonth, setStudyGoalMonth] = useState(String(apprenticeGoals?.study_goal_month ?? 40));
  const [workGoalYear, setWorkGoalYear] = useState(String(apprenticeGoals?.work_goal_year ?? 960));
  const [studyGoalYear, setStudyGoalYear] = useState(String(apprenticeGoals?.study_goal_year ?? 480));
  const [masters, setMasters] = useState<any[]>([]);
  const [allApprentices, setAllApprentices] = useState<any[]>([]);
  const [selectedApprenticeId, setSelectedApprenticeId] = useState<string | null>(null);
  const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [unlockedCertsCount, setUnlockedCertsCount] = useState(0);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [apprenticeCerts, setApprentiecCerts] = useState<any[]>([]);
  const [editCredsModalVisible, setEditCredsModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [freshMasterApprentices, setFreshMasterApprentices] = useState<any[]>([]);

  useEffect(() => {
    console.log("🎯 ProfileScreen useEffect - user.role:", user?.role, "user.id:", user?.id);
    if (user?.role === "Učedník") {
      console.log("📱 Jedu jako Učedník - loadMasters + calculateCerts");
      loadMasters();
      calculateCertificatesForApprentice(user.id);
    } else if (user?.role === "Mistr") {
      console.log("👨‍🏫 Jedu jako Mistr - loadAllApprentices");
      loadAllApprentices();
    }
  }, [user?.id]);

  /* New state for persistent keyboard offset */
  const [persistentBottomPadding, setPersistentBottomPadding] = useState(0);

  useEffect(() => {
    // Only listener for showing keyboard to "lock" the height
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // Use a slightly smaller value than full keyboard height if desired, 
        // or full height to be safe. e.endCoordinates.height is standard.
        // We set it once and don't reset it on hide.
        setPersistentBottomPadding(e.endCoordinates.height);
      }
    );

    // We do NOT listen to keyboardDidHide to reset it, per user request.
    // It will only reset when modal closes.

    return () => {
      showListener.remove();
    };
  }, []);

  // Reset padding when modal closes
  useEffect(() => {
    if (!goalModalVisible) {
      setPersistentBottomPadding(0);
    }
  }, [goalModalVisible]);

  // Update local state when apprenticeGoals changes from context
  useEffect(() => {
    if (apprenticeGoals) {
      setWorkGoalWeek(String(apprenticeGoals.work_goal_week ?? 20));
      setStudyGoalWeek(String(apprenticeGoals.study_goal_week ?? 10));
      setWorkGoalMonth(String(apprenticeGoals.work_goal_month ?? 80));
      setStudyGoalMonth(String(apprenticeGoals.study_goal_month ?? 40));
      setWorkGoalYear(String(apprenticeGoals.work_goal_year ?? 960));
      setStudyGoalYear(String(apprenticeGoals.study_goal_year ?? 480));
    }
  }, [apprenticeGoals]);

  // Reload certs when Master Filter changes (for Apprentice role)
  useEffect(() => {
    if (user?.role === "Učedník") {
      if (masters.length > 0 && userData.selectedMaster) {
        const currentMaster = masters.find(m => m.name === userData.selectedMaster);
        // If specific master found, filter by ID. Else (e.g. "Všichni" logic if implemented later) show all.
        // Currently userData.selectedMaster stores name.
        if (currentMaster) {
          calculateCertificatesForApprentice(user.id, currentMaster.id);
        } else {
          calculateCertificatesForApprentice(user.id);
        }
      } else {
        calculateCertificatesForApprentice(user.id);
      }
    }
  }, [userData.selectedMaster, masters, user?.id, user?.role]);

  const handleUpdateCredentials = async () => {
    if (!newEmail.trim() && !newPassword.trim()) {
      Alert.alert("Chyba", "Vyplň alespoň email nebo heslo");
      return;
    }
    try {
      const updates: any = {};
      if (newEmail.trim()) updates.email = newEmail;
      if (newPassword.trim()) updates.password = newPassword;

      await api.updateUser(user?.id || "", updates);

      setEditCredsModalVisible(false);
      setNewEmail("");
      setNewPassword("");
      Alert.alert("Úspěch", "Údaje byly aktualizovány");
    } catch (error) {
      Alert.alert("Chyba", "Nepodařilo se aktualizovat údaje");
    }
  };

  const extractTextOnly = (fullComment: string): string => {
    if (!fullComment) return "";
    let text = fullComment.trim();
    while (text.startsWith("♥")) {
      text = text.slice(1).trim();
    }
    return text;
  };

  const extractHeartsOnly = (fullComment: string): string => {
    if (!fullComment) return "";
    let hearts = "";
    let i = 0;
    while (i < fullComment.length && fullComment[i] === "♥") {
      hearts += "♥";
      i++;
      while (i < fullComment.length && fullComment[i] === " ") {
        i++;
      }
    }
    return hearts;
  };

  const handleSaveComment = async () => {
    if (!selectedProject) return;
    try {
      const originalComment = selectedProject.master_comment || "";
      const hearts = extractHeartsOnly(originalComment);
      const newComment = hearts ? `${hearts} ${commentText}`.trim() : commentText;

      await api.updateProject(selectedProject.id, { master_comment: newComment });
      setCommentModalVisible(false);
      setSelectedProject(null);
      setCommentText("");

      const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
      if (data) {
        const parsed = JSON.parse(data);
        const updatedProjects = parsed.projects.map((p: any) =>
          p.id === selectedProject.id ? { ...p, master_comment: newComment } : p
        );
        await AsyncStorage.setItem("masterSelectedApprenticeData", JSON.stringify({ ...parsed, projects: updatedProjects }));
        setSelectedApprenticeData({ ...parsed, projects: updatedProjects });
      }
    } catch (error) {
      console.error("Error saving comment:", error);
    }
  };

  const calculateCertificatesForApprentice = async (userId: string, filterMasterId?: string) => {
    try {
      console.log("📊 calculateCertificatesForApprentice spuštěn pro userId:", userId, "FilterMaster:", filterMasterId);
      const [dbCerts, workHours, projects, templates, history, allRules] = await Promise.all([
        api.getCertificates(userId).catch(() => []),
        api.getWorkHours(userId).catch(() => []),
        api.getProjects(userId).catch(() => []),
        api.getCertificateTemplates().catch(() => []),
        api.getCertificateUnlockHistory(userId).catch(() => []),
        api.getAllCertificateUnlockRules().catch(() => [])
      ]);

      let relevantWorkHours = workHours;
      let relevantProjects = projects;

      // FILTER BY MASTER if applied
      if (filterMasterId) {
        relevantWorkHours = workHours.filter((h: any) => String(h.master_id) === String(filterMasterId));
        relevantProjects = projects.filter((p: any) => String(p.master_id) === String(filterMasterId));
      }

      const totalWorkHours = relevantWorkHours
        .filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description))
        .reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);

      const totalStudyHours = relevantWorkHours
        .filter((h: any) => h.description && /studium|study/i.test(h.description))
        .reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);

      const totalAllHours = totalWorkHours + totalStudyHours;
      const totalProjectsCount = relevantProjects?.length || 0;

      console.log("💾 totalWorkHours (Filtered):", totalWorkHours, "totalProjects:", totalProjectsCount);

      let unlockedCount = 0;
      const certsWithRules = templates.map((tmpl: any) => {
        const existing = dbCerts.find((c: any) =>
          c.title?.trim().toLowerCase() === tmpl.title?.trim().toLowerCase()
        );
        const rules = allRules.filter((r: any) => r.template_id === tmpl.id);

        let requirementText = "Splnění kritérií";
        let hasManualRule = false;

        let shouldBeUnlocked = false;

        // Determine Base Status from DB
        if (existing && !existing.locked) {
          // If filter applied, check ownership
          if (filterMasterId) {
            if (String(existing.unlocked_by || existing.master_id) === String(filterMasterId)) {
              shouldBeUnlocked = true;
            }
          } else {
            shouldBeUnlocked = true;
          }
        }

        if (rules.length === 0) {
          requirementText = "Bez kritérií";
        } else {
          const descriptions: string[] = [];
          const automaticRules = rules.filter((r: any) => r.rule_type !== "MANUAL");

          for (const rule of rules) {
            if (rule.rule_type === "MANUAL") {
              descriptions.push("Odemknutí mistrem");
              hasManualRule = true;
            } else if (rule.condition_type === "WORK_HOURS") {
              descriptions.push(`Odpracuj ${rule.condition_value} hodin`);
            } else if (rule.condition_type === "STUDY_HOURS") {
              descriptions.push(`Nastuduj ${rule.condition_value} hodin`);
            } else if (rule.condition_type === "TOTAL_HOURS") {
              descriptions.push(`Celkem ${rule.condition_value} hodin (práce + studium)`);
            } else if (rule.condition_type === "PROJECTS") {
              descriptions.push(`Dokončeno ${rule.condition_value} projektů`);
            }
          }
          requirementText = descriptions.join(" • ");

          // Check Automatic Criteria (using filtered totals)
          // Only if NOT already unlocked (or re-verify unlocked status dynamically?)
          // If existing DB record says unlocked, we respected it above.
          // Now check dynamic if not yet unlocked.
          if (!shouldBeUnlocked && automaticRules.length > 0) {
            const criteriaMet = automaticRules.every((rule: any) => {
              if (rule.condition_type === "NONE") return true;
              if (rule.condition_type === "WORK_HOURS") return totalWorkHours >= rule.condition_value;
              if (rule.condition_type === "STUDY_HOURS") return totalStudyHours >= rule.condition_value;
              if (rule.condition_type === "TOTAL_HOURS") return totalAllHours >= rule.condition_value;
              if (rule.condition_type === "PROJECTS") return totalProjectsCount >= rule.condition_value;
              return false;
            });
            if (criteriaMet) shouldBeUnlocked = true;
          }
        }

        if (shouldBeUnlocked) unlockedCount++;
        const historyItem = history.find((h: any) => String(h.template_id) === String(tmpl.id));

        return {
          ...tmpl,
          ...existing,
          id: existing?.id || tmpl.id,
          template_id: tmpl.id,
          locked: !shouldBeUnlocked,
          requirement: requirementText,
          hasManualRule,
          unlocked_by: shouldBeUnlocked && filterMasterId ? filterMasterId : (historyItem?.unlocked_by || existing?.unlocked_by)
        };
      });

      console.log("📋 certsWithRules:", certsWithRules.length);
      setApprentiecCerts(certsWithRules);
      setUnlockedCertsCount(unlockedCount);
    } catch (error) {
      console.error("❌ Chyba při počítání certifikátů:", error);
    }
  };

  // Load selected apprentice data whenever screen focuses
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        console.log("🔄 useFocusEffect na ProfileScreen - role:", user?.role);
        if (user?.role === "Mistr") {
          // Stáhni FRESH seznam učedníků tohoto mistra s jejich aktuálními jmény
          try {
            const connectedApprentices = await api.getApprentices(user.id);
            const allUsers = await getAllUsers();

            const enrichedApprentices = connectedApprentices.map((conn: any) => {
              const freshUser = allUsers.find((u: any) => u.id === conn.apprentice_id);
              return {
                ...conn,
                apprenticeId: conn.apprentice_id,
                apprenticeName: freshUser?.name || conn.apprentice_name || "Neznámý",
                apprenticeEmail: freshUser?.email || conn.email || ""
              };
            });

            console.log("✅ Fresh apprentices loaded:", enrichedApprentices);
            setFreshMasterApprentices(enrichedApprentices);
          } catch (e) {
            console.error("Chyba při načítání fresh apprentices:", e);
          }

          const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
          if (data) {
            setSelectedApprenticeData(JSON.parse(data));
          }
        } else if (user?.role === "Učedník") {
          // Reload certifikáty s pravidly když se profil otevře
          await calculateCertificatesForApprentice(user.id);
          // RELOAD GOALS FROM DB
          await reloadApprenticeGoals();
        }
      };
      loadData();
    }, [user?.id, user?.role])
  );



  const loadMasters = async () => {
    try {
      if (!user?.id || user.role !== "Učedník") return;
      console.log("📥 loadMasters from API via getMastersForApprentice");

      const connections = await api.getMastersForApprentice(user.id);
      if (connections.length === 0) {
        setMasters([]);
        return;
      }

      const allUsers = await getAllUsers();
      const mastersList = connections.map((c: any) => {
        const master = allUsers.find((u: any) => u.id === c.master_id);
        return {
          id: c.master_id,
          name: master?.name || "Neznámý mistr",
          craft: "Řemeslo"
        };
      });

      console.log("✅ Masters loaded:", mastersList.length);
      setMasters(mastersList);
    } catch (error) {
      console.error("Chyba při načítání mistrů:", error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .trim()
      .split(/\s+/)
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };



  const loadAllApprentices = async () => {
    try {
      if (!user?.id || user.role !== "Mistr") return;
      console.log("📥 loadAllApprentices for master");
      const all = await getAllUsers();
      setAllApprentices(all.filter((u: any) => u.role === "Učedník"));
    } catch (error) {
      console.error("❌ Chyba při načítání učedníků:", error);
    }
  };

  const loadSelectedApprenticeData = async (apprenticeId: string) => {
    try {
      console.log("📥 Loading data for apprentice:", apprenticeId);
      const allUsers = await getAllUsers();
      const apprentice = allUsers.find((u: any) => u.id === apprenticeId);

      if (apprentice) {
        // Načti data z AsyncStorage
        const storageKey = `userData_${apprenticeId}`;
        const saved = await AsyncStorage.getItem(storageKey);
        const userData = saved ? JSON.parse(saved) : {};

        // Načti z API - projekty, work hours a certifikáty
        let projects = [];
        let workHours = [];
        let certs = [];
        let allTemplates = [];
        let allRules = [];

        try {
          [projects, workHours, certs, allTemplates, allRules] = await Promise.all([
            api.getProjects(apprenticeId).catch(() => []) || [],
            api.getWorkHours(apprenticeId).catch(() => []) || [],
            api.getCertificates(apprenticeId).catch(() => []) || [],
            api.getCertificateTemplates().catch(() => []) || [],
            api.getAllCertificateUnlockRules().catch(() => []) || []
          ]);
        } catch (e) {
          console.log("API fallback by parts failed, partial load/local");
          // Fallbacks handled above by catch defaults in Promise.all or manual
        }

        // --- FILTER DATA FOR MASTER CONTEXT ---
        const myHours = workHours.filter((h: any) => String(h.master_id) === String(user.id));
        const myProjects = projects.filter((p: any) => String(p.master_id) === String(user.id));

        const myWorkH = myHours.filter((h: any) => !(h.description || "").match(/studium|study/i)).reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);
        const myStudyH = myHours.filter((h: any) => (h.description || "").match(/studium|study/i)).reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);
        const myTotalH = myWorkH + myStudyH;
        const myProjCount = myProjects.length;

        const totalHours = workHours.reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);

        // Přepočítej pravidla pro certifikáty (Pouze pro MISTRA)
        let certificatesWithRules = certs;
        try {
          certificatesWithRules = certs.map((cert: any) => {
            const template = allTemplates.find((t: any) => t.title === cert.title);
            const rules = template ? allRules.filter((r: any) => r.template_id === template.id) : [];
            const autoRules = rules.filter((r: any) => r.rule_type !== "MANUAL");

            let requirementText = "Splnění kritérií";
            let hasManualRule = false;
            let isUnlocked = false;

            // Check Rules Description
            if (rules.length === 0) {
              requirementText = "Bez kritérií";
            } else {
              const descriptions: string[] = [];
              for (const rule of rules) {
                if (rule.rule_type === "MANUAL") {
                  descriptions.push("Odemknutí mistrem");
                  hasManualRule = true;
                } else if (rule.condition_type === "WORK_HOURS") descriptions.push(`Odpracuj ${rule.condition_value} hodin`);
                else if (rule.condition_type === "STUDY_HOURS") descriptions.push(`Nastuduj ${rule.condition_value} hodin`);
                else if (rule.condition_type === "TOTAL_HOURS") descriptions.push(`Celkem ${rule.condition_value} hodin`);
                else if (rule.condition_type === "PROJECTS") descriptions.push(`Dokončeno ${rule.condition_value} projektů`);
              }
              requirementText = descriptions.join(" • ");
            }

            // Determine Unlock Status (MASTER SPECIFIC)
            if (hasManualRule) {
              // Must be unlocked in DB AND by ME
              if (!cert.locked && String(cert.unlocked_by || cert.master_id) === String(user.id)) {
                isUnlocked = true;
              }
            } else {
              // Automatic - Check MY stats
              // Logic: Assume AND logic for simplicity unless defined otherwise (OR logic is less common for basic badges here, though supported in main calculator)
              // For robust check, replicate MasterBadgesScreen logic:
              if (autoRules.length > 0) {
                isUnlocked = true;
                for (const rule of autoRules) {
                  if (rule.condition_type === "WORK_HOURS" && myWorkH < rule.condition_value) isUnlocked = false;
                  if (rule.condition_type === "STUDY_HOURS" && myStudyH < rule.condition_value) isUnlocked = false;
                  if (rule.condition_type === "TOTAL_HOURS" && myTotalH < rule.condition_value) isUnlocked = false;
                  if (rule.condition_type === "PROJECTS" && myProjCount < rule.condition_value) isUnlocked = false;
                }
              }
            }

            return {
              ...cert,
              locked: !isUnlocked,
              requirement: requirementText,
              hasManualRule,
              unlocked_by: isUnlocked ? user.id : null, // If unlocked by me, show my ID. If NOT unlocked by me (but by others), it shows LOCKED.
              id: template ? template.id : cert.id
            };
          });
        } catch (e) {
          console.log("Chyba při počítání pravidel:", e);
        }

        const unlockedCerts = certificatesWithRules?.filter((c: any) => !c.locked).length || 0;

        const selectedData = {
          id: apprenticeId,
          name: apprentice.name,
          email: apprentice.email,
          totalHours,
          projectCount: projects.length,
          unlockedCerts,
          apprenticeLevel: userData.apprenticeLevel || "Začátečník",
          projects,
          workHours,
          certificates: certificatesWithRules,
          weeklyGoal: userData.weeklyGoal || { work: 40, study: 5 },
        };

        setSelectedApprenticeData(selectedData);
        await AsyncStorage.setItem("masterSelectedApprenticeData", JSON.stringify(selectedData));
      }
    } catch (error) {
      console.error("❌ Chyba při načítání dat učedníka:", error);
    }
  };

  const totalHours = getTotalHours();

  const currentWorkHours = user?.role === "Mistr" && selectedApprenticeData ? selectedApprenticeData.workHours : userData.workHours;
  const workH = (currentWorkHours || []).filter((h: any) => !(h.description || "").match(/studium|study/i)).reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);
  const studyH = (currentWorkHours || []).filter((h: any) => (h.description || "").match(/studium|study/i)).reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0);

  const ProfileItem = ({ icon, label, value, onPress, valueStyle }: any) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.itemLeft}>
        <Feather name={icon} size={20} color={theme.textSecondary} />
        <ThemedText style={styles.itemLabel}>{label}</ThemedText>
      </View>
      {value ? (
        <ThemedText style={[styles.itemValue, { color: theme.textSecondary }, valueStyle]}>
          {value}
        </ThemedText>
      ) : (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      )}
    </Pressable>
  );

  const BadgeDetailModal = () => {
    if (!selectedBadge) return null;
    const badgeColor = (
      selectedBadge.category?.toLowerCase().includes("badge") ||
      selectedBadge.category?.toLowerCase().includes("odznak") ||
      selectedBadge.title?.toLowerCase().includes("badge") ||
      selectedBadge.title?.toLowerCase().includes("odznak")
    ) ? theme.primary : theme.secondary;

    return (
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable
          onPress={() => setSelectedBadge(null)}
          style={[styles.modalOverlay, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: badgeColor,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconContainer,
                {
                  backgroundColor: badgeColor + "20",
                },
              ]}
            >
              <Feather
                name={selectedBadge.locked ? "lock" : "award"}
                size={48}
                color={badgeColor}
              />
            </View>

            <ThemedText style={[styles.modalTitle, { color: badgeColor, fontWeight: "700" }]}>
              {selectedBadge.title}
            </ThemedText>

            <ThemedText style={[styles.modalCategory, { color: theme.textSecondary }]}>
              {selectedBadge.category}
            </ThemedText>

            {selectedBadge.unlocked_by && (
              <View style={[styles.masterNameBox, { marginTop: Spacing.sm }]}>
                <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary }]}>
                  Uděli: <ThemedText style={{ color: badgeColor, fontWeight: '600', textTransform: 'none' }}>
                    {allUsers.find((u: any) => String(u.id) === String(selectedBadge.unlocked_by))?.name || "Neznámý mistr"}
                  </ThemedText>
                </ThemedText>
              </View>
            )}

            {selectedApprenticeData && (
              <View style={[styles.masterNameBox, { marginTop: Spacing.sm }]}>
                <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary }]}>
                  Učedník: <ThemedText style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{selectedApprenticeData.name}</ThemedText>
                </ThemedText>
              </View>
            )}

            <View
              style={[
                styles.requirementBox,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: badgeColor,
                },
              ]}
            >
              <ThemedText style={[styles.requirementLabel, { color: theme.textSecondary }]}>
                Jak získat:
              </ThemedText>
              <ThemedText style={[styles.requirementText, { color: theme.text }]}>
                {selectedBadge.requirement || "Splnění kritérií"}
              </ThemedText>
            </View>


            <View style={styles.modalFooter}>
              <View style={styles.pointsRow}>
                <Feather name="zap" size={16} color={badgeColor} />
                <ThemedText style={[styles.pointsValue, { color: badgeColor, fontWeight: "700" }]}>
                  {selectedBadge.points} bodů
                </ThemedText>
              </View>
              {!selectedBadge.locked && (
                <ThemedText style={[styles.unlockedLabel, { color: badgeColor }]}>
                  ✓ Odemčeno
                </ThemedText>
              )}
            </View>

            <Pressable
              onPress={() => setSelectedBadge(null)}
              style={[styles.closeButton, { backgroundColor: badgeColor }]}
            >
              <ThemedText style={[styles.closeButtonText]}>Zavřít</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.xl + 8,
        paddingBottom: insets.bottom + Spacing.xl + 80,
        paddingHorizontal: Spacing.xl,
      }}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.avatarText} numberOfLines={1} adjustsFontSizeToFit>
            {getInitials(user?.name || "Uživatel")}
          </ThemedText>
        </View>
        <ThemedText style={styles.name}>
          {user?.name || "Uživatel"}
        </ThemedText>

        <ThemedText style={[
          styles.roleText,
          {
            color: user?.role === 'Mistr' ? theme.primary :
              user?.role === 'Učedník' ? theme.secondary :
                user?.role === 'Admin' ? theme.error :
                  theme.textSecondary
          }
        ]}>
          {user?.role}
        </ThemedText>

        <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
          {user?.email}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          PŘIHLÁŠENÍ S ÚROVNÍ
        </ThemedText>
        <ProfileItem
          icon="tag"
          label="Role"
          value={user?.role}
          valueStyle={{
            color: user?.role === 'Mistr' ? theme.primary :
              user?.role === 'Učedník' ? theme.secondary :
                user?.role === 'Admin' ? theme.error :
                  theme.text,
            fontWeight: '900',
            fontSize: 18
          }}
        />
        {user?.role !== "Host" && (
          <>
            {user?.role === "Učedník" && (
              <ProfileItem
                icon="user"
                label={masters.length > 1 ? "Mistři" : "Mistr"}
                value={masters.length > 0 ? masters.map(m => m.name).join(", ") : userData.selectedMaster}
                onPress={() => {
                  loadMasters();
                  setMasterModalVisible(true);
                }}
              />
            )}
            {user?.role === "Mistr" && (
              <ProfileItem
                icon="user"
                label="Vybraný učedník"
                value={selectedApprenticeData?.name}
                onPress={() => {
                  loadAllApprentices();
                  setSelectApprenticeModalVisible(true);
                }}
              />
            )}
            <ProfileItem icon="briefcase" label="Řemeslo" value="Dřevářství" />
            <ProfileItem icon="calendar" label="Začátek" value="Září 2025" />
          </>
        )}
      </View>
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          CECH
        </ThemedText>
        <ProfileItem
          icon="users"
          label="Přehled Cechu"
          value="Mistři a Učedníci"
          onPress={() => navigation.navigate("GuildOverview")}
        />
        <ProfileItem icon="book-open" label="Pravidla Cechu" value="Verze 2.4" />
      </View>

      {user?.role !== "Host" && (
        <>
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              STATISTIKY
            </ThemedText>
            {user?.role === "Mistr" && selectedApprenticeData ? (
              <>
                <ProfileItem icon="clock" label="Celkem hodin" value={`${selectedApprenticeData.totalHours}h`} />
                <ProfileItem icon="briefcase" label="Práce" value={`${Math.round(workH * 10) / 10}h`} valueStyle={{ color: theme.primary }} />
                <ProfileItem icon="book" label="Studium" value={`${Math.round(studyH * 10) / 10}h`} valueStyle={{ color: theme.secondary }} />
                <ProfileItem icon="folder" label="Projekty" value={String(selectedApprenticeData.projectCount)} />
                <ProfileItem icon="award" label="Certifikáty" value={String(selectedApprenticeData.unlockedCerts)} />
              </>
            ) : (
              <>
                <ProfileItem icon="clock" label="Celkem hodin" value={`${totalHours}h`} />
                <ProfileItem icon="briefcase" label="Práce" value={`${Math.round(workH * 10) / 10}h`} valueStyle={{ color: theme.primary }} />
                <ProfileItem icon="book" label="Studium" value={`${Math.round(studyH * 10) / 10}h`} valueStyle={{ color: theme.secondary }} />
                <ProfileItem icon="folder" label="Projekty" value={String(userData.projects.length)} />
                <Pressable
                  onPress={() => {
                    if (apprenticeCerts.length > 0) {
                      setSelectedBadge(apprenticeCerts[0]);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <Feather name="award" size={20} color={theme.textSecondary} />
                    <ThemedText style={styles.itemLabel}>Certifikáty</ThemedText>
                  </View>
                  <ThemedText style={[styles.itemValue, { color: theme.textSecondary }]}>
                    {unlockedCertsCount} / {apprenticeCerts.length}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              NASTAVENÍ
            </ThemedText>
            {user?.role === "Mistr" && selectedApprenticeData ? (
              <ProfileItem icon="award" label="Stupeň" value={selectedApprenticeData.apprenticeLevel} />
            ) : (
              <>
                <ProfileItem icon="target" label="Hodinové cíle" onPress={() => setGoalModalVisible(true)} />
                <ProfileItem icon="award" label="Stupeň" value={userData.apprenticeLevel} onPress={() => setLevelModalVisible(true)} />
                <ProfileItem icon="bell" label="Upozornění" onPress={() => { }} />
                <ProfileItem icon="moon" label="Tmavý režim" onPress={() => { }} />
                <ProfileItem icon="lock" label="Soukromí" onPress={() => { }} />
              </>
            )}
          </View>
        </>
      )}

      {user?.role === "Mistr" && selectedApprenticeData && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PROJEKTY
          </ThemedText>
          {selectedApprenticeData.projects && selectedApprenticeData.projects.length > 0 ? (
            <GestureHandlerRootView>
              {selectedApprenticeData.projects.map((project: any) => (
                <Swipeable
                  key={project.id}
                  renderRightActions={() => (
                    <Pressable
                      onPress={() => {
                        setSelectedProject(project);
                        setCommentText("");
                        setCommentModalVisible(true);
                      }}
                      style={[styles.swipeAction, { backgroundColor: theme.primary }]}
                    >
                      <Feather name="message-circle" size={20} color="#fff" />
                      <ThemedText style={[styles.swipeActionText, { color: "#fff" }]}>Komentář</ThemedText>
                    </Pressable>
                  )}
                >
                  <View style={[styles.projectCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                    <ThemedText style={styles.projectTitle}>{project.title}</ThemedText>
                    <ThemedText style={[styles.projectDesc, { color: theme.textSecondary }]}>{project.description}</ThemedText>
                  </View>
                </Swipeable>
              ))}
            </GestureHandlerRootView>
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Žádné projekty</ThemedText>
          )}
        </View>
      )}

      {/* Grid s detailem úspěchů */}
      {apprenticeCerts && apprenticeCerts.length > 0 && (
        <>
          {apprenticeCerts.some(c => c.category?.toLowerCase().includes("odznak") || c.category?.toLowerCase().includes("badge")) && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                ODZNAKY
              </ThemedText>
              <View style={styles.certificatesGrid}>
                {apprenticeCerts
                  .filter(c =>
                    c.category?.toLowerCase().includes("odznak") ||
                    c.category?.toLowerCase().includes("badge") ||
                    c.title?.toLowerCase().includes("odznak") ||
                    c.title?.toLowerCase().includes("badge")
                  )
                  .map((cert: any, idx: number) => {
                    const badgeColor = theme.primary; // Define badgeColor for this context
                    return (
                      <Pressable
                        key={`badge-${idx}`}
                        onPress={() => setSelectedBadge(cert)}
                        style={({ pressed }) => [
                          styles.certCard,
                          {
                            backgroundColor: cert.locked ? theme.backgroundDefault : badgeColor + "20",
                            opacity: pressed ? 0.7 : 1,
                            borderColor: cert.locked ? theme.border : badgeColor,
                          },
                        ]}
                      >
                        <Feather
                          name={cert.locked ? "lock" : "award"}
                          size={24}
                          color={cert.locked ? theme.textSecondary : badgeColor}
                        />
                        <ThemedText style={[styles.certTitle, { color: theme.text }]} numberOfLines={2}>
                          {cert.title}
                        </ThemedText>
                        {cert.unlocked_by && (
                          <View style={[styles.masterBadgeInitials, { backgroundColor: theme.backgroundDefault, borderColor: cert.locked ? theme.border : badgeColor }]}>
                            <ThemedText style={[styles.masterBadgeInitialsText, { color: cert.locked ? theme.textSecondary : badgeColor }]}>
                              {getInitials(allUsers.find(u => String(u.id) === String(cert.unlocked_by))?.name || "")}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}

          {apprenticeCerts.some(c => c.category?.toLowerCase().includes("certifikát") || c.category?.toLowerCase().includes("certificate")) && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                CERTIFIKÁTY
              </ThemedText>
              <View style={styles.certificatesGrid}>
                {apprenticeCerts
                  .filter(c =>
                    c.category?.toLowerCase().includes("certifikát") ||
                    c.category?.toLowerCase().includes("certificate") ||
                    c.title?.toLowerCase().includes("certifikát") ||
                    c.title?.toLowerCase().includes("certificate")
                  )
                  .map((cert: any, idx: number) => {
                    const badgeColor = theme.secondary; // Define badgeColor for this context
                    return (
                      <Pressable
                        key={`cert-${idx}`}
                        onPress={() => setSelectedBadge(cert)}
                        style={({ pressed }) => [
                          styles.certCard,
                          {
                            backgroundColor: cert.locked ? theme.backgroundDefault : badgeColor + "20",
                            opacity: pressed ? 0.7 : 1,
                            borderColor: cert.locked ? theme.border : badgeColor,
                          },
                        ]}
                      >
                        <Feather
                          name={cert.locked ? "lock" : "award"}
                          size={24}
                          color={cert.locked ? theme.textSecondary : badgeColor}
                        />
                        <ThemedText style={[styles.certTitle, { color: theme.text }]} numberOfLines={2}>
                          {cert.title}
                        </ThemedText>
                        {cert.unlocked_by && (
                          <View style={[styles.masterBadgeInitials, { backgroundColor: theme.backgroundDefault, borderColor: cert.locked ? theme.border : badgeColor }]}>
                            <ThemedText style={[styles.masterBadgeInitialsText, { color: cert.locked ? theme.textSecondary : badgeColor }]}>
                              {getInitials(allUsers.find(u => String(u.id) === String(cert.unlocked_by))?.name || "")}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>VZHLED APLIKACE</ThemedText>
        <View style={{ flexDirection: 'row', backgroundColor: theme.backgroundTertiary || theme.backgroundSecondary, borderRadius: BorderRadius.sm, padding: 4, gap: 4 }}>
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setThemeMode(mode)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: BorderRadius.xs - 2,
                backgroundColor: themeMode === mode ? theme.backgroundDefault : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: themeMode === mode ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: themeMode === mode ? 0.1 : 0,
                shadowRadius: 2,
                elevation: themeMode === mode ? 2 : 0,
              }}
            >
              <ThemedText style={{
                color: themeMode === mode ? theme.text : theme.textSecondary,
                fontWeight: themeMode === mode ? '600' : '400',
                fontSize: 13
              }}>
                {mode === 'system' ? 'Automaticky' : mode === 'light' ? 'Světlý' : 'Tmavý'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {user?.role !== "Host" && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ADMINISTRACE
          </ThemedText>
          <Pressable
            onPress={() => setDeleteHoursModalVisible(true)}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: theme.error + "20", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.itemLeft}>
              <Feather name="trash-2" size={20} color={theme.error} />
              <ThemedText style={[styles.itemLabel, { color: theme.error }]}>Smazat všechny časy</ThemedText>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setDeleteProjectsModalVisible(true)}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: theme.error + "20", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.itemLeft}>
              <Feather name="trash-2" size={20} color={theme.error} />
              <ThemedText style={[styles.itemLabel, { color: theme.error }]}>Smazat všechny projekty</ThemedText>
            </View>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        {user?.role !== "Mistr" && (
          <Pressable
            onPress={() => {
              setNewEmail(user?.email || "");
              setNewPassword("");
              setEditCredsModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.itemLeft}>
              <Feather name="edit-2" size={20} color={theme.textSecondary} />
              <ThemedText style={styles.itemLabel}>Změnit přihlašovací údaje</ThemedText>
            </View>
          </Pressable>
        )}
        <Pressable
          onPress={async () => {
            await logout();
          }}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: theme.error + "20", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.itemLeft}>
            <Feather name="log-out" size={20} color={theme.error} />
            <ThemedText style={[styles.itemLabel, { color: theme.error }]}>Odhlásit se</ThemedText>
          </View>
        </Pressable>
      </View>

      <BadgeDetailModal />

      <Modal visible={editCredsModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => { Keyboard.dismiss(); setEditCredsModalVisible(false); }}>
            <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => { }}>
              <ScrollView scrollEnabled={true} bounces={false}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Změnit údaje</ThemedText>
                  <Pressable onPress={() => { Keyboard.dismiss(); setEditCredsModalVisible(false); }}>
                    <Feather name="x" size={24} color={theme.text} />
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.commentInput, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  value={newEmail}
                  onChangeText={setNewEmail}
                />
                <TextInput
                  style={[styles.commentInput, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                  placeholder="Nové heslo"
                  placeholderTextColor={theme.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <Pressable
                  style={[styles.saveButton, { backgroundColor: theme.primary }]}
                  onPress={() => { Keyboard.dismiss(); handleUpdateCredentials(); }}
                >
                  <ThemedText style={styles.saveButtonText}>Uložit</ThemedText>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={commentModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => { Keyboard.dismiss(); setCommentModalVisible(false); }}>
            <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => { }}>
              <ScrollView scrollEnabled={true} bounces={false}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Komentář k projektu</ThemedText>
                  <Pressable onPress={() => { Keyboard.dismiss(); setCommentModalVisible(false); }}>
                    <Feather name="x" size={24} color={theme.text} />
                  </Pressable>
                </View>
                <TextInput
                  style={[
                    styles.commentInput,
                    { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border },
                  ]}
                  placeholder="Napiš svůj komentář..."
                  placeholderTextColor={theme.textSecondary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  numberOfLines={6}
                />
                <Pressable
                  style={[styles.saveButton, { backgroundColor: theme.primary }]}
                  onPress={() => { Keyboard.dismiss(); handleSaveComment(); }}
                >
                  <ThemedText style={styles.saveButtonText}>Uložit komentář</ThemedText>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={deleteHoursModalVisible} transparent={true} animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.confirmModal, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="alert-circle" size={48} color={theme.error} />
            <ThemedText style={[styles.confirmTitle, { color: theme.text }]}>Smazat všechny časy?</ThemedText>
            <ThemedText style={[styles.confirmText, { color: theme.textSecondary }]}>
              Tato akce není vrátitelná. Všechny zaznamenané časy budou odstraněny.
            </ThemedText>
            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => setDeleteHoursModalVisible(false)}
                style={[styles.confirmButton, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, borderWidth: 1 }]}
              >
                <ThemedText style={[styles.confirmButtonText, { color: theme.text }]}>Zrušit</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  deleteAllWorkHours();
                  setDeleteHoursModalVisible(false);
                }}
                style={[styles.confirmButton, { backgroundColor: theme.error }]}
              >
                <ThemedText style={[styles.confirmButtonText, { color: "#FFFFFF" }]}>Smazat</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteProjectsModalVisible} transparent={true} animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.confirmModal, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="alert-circle" size={48} color={theme.error} />
            <ThemedText style={[styles.confirmTitle, { color: theme.text }]}>Smazat všechny projekty?</ThemedText>
            <ThemedText style={[styles.confirmText, { color: theme.textSecondary }]}>
              Tato akce není vrátitelná. Všechny vaše projekty budou odstraněny.
            </ThemedText>
            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => setDeleteProjectsModalVisible(false)}
                style={[styles.confirmButton, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, borderWidth: 1 }]}
              >
                <ThemedText style={[styles.confirmButtonText, { color: theme.text }]}>Zrušit</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  deleteAllProjects();
                  setDeleteProjectsModalVisible(false);
                }}
                style={[styles.confirmButton, { backgroundColor: theme.error }]}
              >
                <ThemedText style={[styles.confirmButtonText, { color: "#FFFFFF" }]}>Smazat</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={levelModalVisible} transparent={true} animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nastavit stupeň</ThemedText>
              <Pressable onPress={() => setLevelModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.levelContainer}>
              {["poutník", "nádeník", "učedník", "tovaryš", "mistr"].map((level) => (
                <Pressable
                  key={level}
                  onPress={() => {
                    setApprenticeLevel(level as any);
                    setLevelModalVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.levelButton,
                    {
                      backgroundColor: userData.apprenticeLevel === level ? theme.primary : theme.backgroundRoot,
                      opacity: pressed ? 0.7 : 1,
                      borderColor: userData.apprenticeLevel === level ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.levelText,
                      { color: userData.apprenticeLevel === level ? "#fff" : theme.text },
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={goalModalVisible} transparent={true} animationType="slide">
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={[
            styles.modalOverlay,
            {
              backgroundColor: "rgba(0,0,0,0.5)",
              // Apply persistent padding to the bottom of the overlay/container
              paddingBottom: persistentBottomPadding
            }
          ]}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, maxHeight: "80%" }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Nastavit cile</ThemedText>
                <Pressable onPress={() => setGoalModalVisible(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="always">
                <View style={styles.periodTabs}>
                  {(["week", "month", "year"] as const).map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => setGoalPeriod(p)}
                      style={[
                        styles.periodTab,
                        {
                          backgroundColor: goalPeriod === p ? theme.primary : theme.backgroundTertiary,
                          borderColor: goalPeriod === p ? theme.primary : theme.border,
                          paddingVertical: 8, // Compact
                        }
                      ]}
                    >
                      <ThemedText style={{ color: goalPeriod === p ? "#fff" : theme.text, fontWeight: "600", fontSize: 13 }}>
                        {p === "week" ? "Tyden" : p === "month" ? "Mesic" : "Rok"}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.goalInputContainer}>
                  {(() => {
                    const limits = userLimits || adminSettings;
                    let workVal, setWork, workMax, studyVal, setStudy, studyMax;

                    switch (goalPeriod) {
                      case "week":
                        workVal = workGoalWeek; setWork = setWorkGoalWeek; workMax = limits.max_work_hours_week;
                        studyVal = studyGoalWeek; setStudy = setStudyGoalWeek; studyMax = limits.max_study_hours_week;
                        break;
                      case "month":
                        workVal = workGoalMonth; setWork = setWorkGoalMonth; workMax = limits.max_work_hours_month;
                        studyVal = studyGoalMonth; setStudy = setStudyGoalMonth; studyMax = limits.max_study_hours_month;
                        break;
                      case "year":
                        workVal = workGoalYear; setWork = setWorkGoalYear; workMax = limits.max_work_hours_year;
                        studyVal = studyGoalYear; setStudy = setStudyGoalYear; studyMax = limits.max_study_hours_year;
                        break;
                      default: // fallback
                        workVal = workGoalWeek; setWork = setWorkGoalWeek; workMax = limits.max_work_hours_week;
                        studyVal = studyGoalWeek; setStudy = setStudyGoalWeek; studyMax = limits.max_study_hours_week;
                    }

                    return (
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.goalLabel, { color: theme.text, fontSize: 13 }]}>
                            Prace (max {workMax})
                          </ThemedText>
                          <TextInput
                            style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                            value={workVal}
                            onChangeText={setWork}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.goalLabel, { color: theme.text, fontSize: 13 }]}>
                            Studium (max {studyMax})
                          </ThemedText>
                          <TextInput
                            style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                            value={studyVal}
                            onChangeText={setStudy}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    );
                  })()}

                  <Pressable
                    style={({ pressed }) => [
                      styles.createButton,
                      { backgroundColor: theme.secondary, opacity: pressed ? 0.8 : 1, marginTop: Spacing.md, marginBottom: Spacing.xs, paddingVertical: 10 }
                    ]}
                    onPress={() => {
                      const maxs = userLimits || adminSettings;
                      const currentP = goalPeriod; // capture current
                      if (currentP === 'week') {
                        setWorkGoalWeek(String(maxs.max_work_hours_week));
                        setStudyGoalWeek(String(maxs.max_study_hours_week));
                      } else if (currentP === 'month') {
                        setWorkGoalMonth(String(maxs.max_work_hours_month));
                        setStudyGoalMonth(String(maxs.max_study_hours_month));
                      } else {
                        setWorkGoalYear(String(maxs.max_work_hours_year));
                        setStudyGoalYear(String(maxs.max_study_hours_year));
                      }
                      // Keep redundant sets for consistency with previous behavior or simplify later
                      setWorkGoalWeek(String(maxs.max_work_hours_week));
                      setStudyGoalWeek(String(maxs.max_study_hours_week));
                      setWorkGoalMonth(String(maxs.max_work_hours_month));
                      setStudyGoalMonth(String(maxs.max_study_hours_month));
                      setWorkGoalYear(String(maxs.max_work_hours_year));
                      setStudyGoalYear(String(maxs.max_study_hours_year));
                    }}
                  >
                    <ThemedText style={[styles.createText, { fontSize: 14 }]}>Nastavit vše na maximum</ThemedText>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.createButton,
                      { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1, marginTop: Spacing.sm, paddingVertical: 10 }
                    ]}
                    onPress={async () => {
                      try {
                        // Helper to validate and parse
                        const parseGoal = (val: string, name: string) => {
                          if (!val) return 0;
                          // Replace comma with dot (global regex)
                          const normalized = val.replace(/,/g, '.');
                          const num = parseFloat(normalized);
                          if (isNaN(num)) return 0;

                          // Check for 0.5 increment
                          if (num % 0.5 !== 0) {
                            throw new Error(`Hodnota pro ${name} musí být celé číslo nebo půlhodina (např. 10.5).`);
                          }
                          return num;
                        };

                        const goals: ApprenticeGoals = {
                          work_goal_week: parseGoal(workGoalWeek, "Týdenní práce"),
                          study_goal_week: parseGoal(studyGoalWeek, "Týdenní studium"),
                          work_goal_month: parseGoal(workGoalMonth, "Měsíční práce"),
                          study_goal_month: parseGoal(studyGoalMonth, "Měsíční studium"),
                          work_goal_year: parseGoal(workGoalYear, "Roční práce"),
                          study_goal_year: parseGoal(studyGoalYear, "Roční studium"),
                        };

                        await saveApprenticeGoals(goals);

                        Alert.alert(
                          "Uloženo",
                          `Týden:\nPráce: ${goals.work_goal_week}h, Studium: ${goals.study_goal_week}h\n\nMěsíc:\nPráce: ${goals.work_goal_month}h, Studium: ${goals.study_goal_month}h\n\nRok:\nPráce: ${goals.work_goal_year}h, Studium: ${goals.study_goal_year}h`,
                          [{ text: "OK", onPress: () => setGoalModalVisible(false) }]
                        );
                      } catch (error: any) {
                        console.log("Validace cíle:", error.message); // Changed from error to log to avoid RedBox
                        Alert.alert("Chyba zadání", error.message || "Zkontrolujte zadané hodnoty.");
                      }
                    }}
                  >
                    <ThemedText style={[styles.createText, { fontSize: 14 }]}>Uložit cíle</ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={masterModalVisible} transparent={true} animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Vybrat mistra</ThemedText>
              <Pressable onPress={() => setMasterModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {masters.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary, padding: Spacing.lg }]}>
                Nejsi propojený s žádným mistrem
              </ThemedText>
            ) : (
              masters.map((master) => (
                <Pressable
                  key={master.id}
                  onPress={() => {
                    setSelectedMaster(master.name);
                    setMasterModalVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.masterItem,
                    {
                      backgroundColor:
                        userData.selectedMaster === master.name
                          ? theme.primary + "20"
                          : theme.backgroundRoot,
                      borderColor: userData.selectedMaster === master.name ? theme.primary : theme.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.masterItemContent}>
                    <ThemedText style={styles.masterName}>{master.name}</ThemedText>
                    <ThemedText style={[styles.masterCraft, { color: theme.textSecondary }]}>
                      {master.craft}
                    </ThemedText>
                  </View>
                  {userData.selectedMaster === master.name && (
                    <Feather name="check" size={20} color={theme.primary} />
                  )}
                </Pressable>
              ))
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={selectApprenticeModalVisible} transparent={true} animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Vybrat učedníka</ThemedText>
              <Pressable onPress={() => setSelectApprenticeModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {freshMasterApprentices.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary, padding: Spacing.lg }]}>
                Nemáš propojené žádné učedníky
              </ThemedText>
            ) : (
              <FlatList
                data={freshMasterApprentices}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={async () => {
                      setSelectedApprenticeId(item.apprenticeId);
                      await loadSelectedApprenticeData(item.apprenticeId);
                      setSelectApprenticeModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.masterItem,
                      {
                        backgroundColor:
                          selectedApprenticeId === item.apprenticeId
                            ? theme.primary + "20"
                            : theme.backgroundRoot,
                        borderColor: selectedApprenticeId === item.apprenticeId ? theme.primary : theme.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={styles.masterItemContent}>
                      <ThemedText style={styles.masterName}>{item.apprenticeName}</ThemedText>
                      <ThemedText style={[styles.masterCraft, { color: theme.textSecondary }]}>
                        {item.apprenticeEmail}
                      </ThemedText>
                    </View>
                    {selectedApprenticeId === item.apprenticeId && (
                      <Feather name="check" size={20} color={theme.primary} />
                    )}
                  </Pressable>
                )}
                keyExtractor={(item) => item.apprenticeId}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={apprenticeModalVisible} transparent={true} animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Moji učedníci</ThemedText>
              <Pressable onPress={() => setApprenticeModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {masterApprentices.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary, padding: Spacing.lg }]}>
                Nemáš propojené žádné učedníky
              </ThemedText>
            ) : (
              <FlatList
                data={masterApprentices}
                renderItem={({ item }) => (
                  <View style={[styles.masterItem, { backgroundColor: theme.backgroundRoot, borderColor: theme.border }]}>
                    <View style={styles.masterItemContent}>
                      <ThemedText style={styles.masterName}>{item.apprenticeName}</ThemedText>
                      <ThemedText style={[styles.masterCraft, { color: theme.textSecondary }]}>
                        {item.apprenticeEmail}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => removeApprentice(item.apprenticeId)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Feather name="trash-2" size={18} color={theme.error} />
                    </Pressable>
                  </View>
                )}
                keyExtractor={(item) => item.apprenticeId}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView >
  );
}

const levelLevels = ["poutník", "nádeník", "učedník", "tovaryš", "mistr"];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: 38,
    lineHeight: 48,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    width: "100%",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  name: {
    ...Typography.title,
    marginBottom: Spacing.xs,
  },
  roleText: {
    ...Typography.body,
    fontWeight: '800',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  email: {
    ...Typography.small,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    ...Typography.label,
    marginBottom: Spacing.md,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemLabel: {
    ...Typography.body,
    marginLeft: Spacing.md,
  },
  itemValue: {
    ...Typography.body,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  logoutText: {
    ...Typography.body,
    fontWeight: "600",
    marginLeft: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
  },
  masterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  masterItemContent: {
    flex: 1,
  },
  masterName: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  masterCraft: {
    ...Typography.small,
  },
  goalInputContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  periodTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  goalLabel: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    height: 50,
    textAlignVertical: "center",
    includeFontPadding: false,
    ...Typography.body,
    fontSize: 20, // Override Typography.body
  },
  createButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  createText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  levelContainer: {
    flexDirection: "column",
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  levelButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  levelText: {
    ...Typography.body,
    fontWeight: "600",
  },
  certificatesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "flex-start",
  },
  certCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  certTitle: {
    ...Typography.small,
    fontWeight: "600",
    textAlign: "center",
  },
  confirmModal: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: "85%",
    alignItems: "center",
  },
  confirmTitle: {
    ...Typography.h4,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  confirmText: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  confirmButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    textAlignVertical: "top",
  },
  saveButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  modalCategory: {
    ...Typography.small,
    marginBottom: Spacing.lg,
  },
  masterBadgeInitials: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 20,
  },
  masterBadgeInitialsText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 14,
  },
  masterNameBox: {
    marginBottom: Spacing.md,
  },
  masterNameLabel: {
    ...Typography.small,
  },
  requirementBox: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    width: "100%",
  },
  requirementLabel: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  requirementText: {
    ...Typography.body,
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: Spacing.lg,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pointsValue: {
    ...Typography.title,
    fontWeight: "700",
  },
  unlockedLabel: {
    ...Typography.small,
    fontWeight: "700",
  },
  closeButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  swipeAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: "90%",
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.md,
    gap: Spacing.xs,
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  projectCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  projectTitle: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  projectDesc: {
    ...Typography.small,
  },
  emptyText: {
    ...Typography.body,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
