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
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, getAllUsers } = useAuth();
  const navigation = useNavigation<any>();
  const { userData, setSelectedMaster, setWeeklyGoal, setApprenticeLevel, getTotalHours, deleteAllWorkHours, deleteAllProjects, apprenticeGoals, saveApprenticeGoals, reloadApprenticeGoals, adminSettings } = useData();
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

  const calculateCertificatesForApprentice = async (userId: string) => {
    try {
      console.log("📊 calculateCertificatesForApprentice spuštěn pro userId:", userId);
      const certs = await api.getCertificates(userId).catch(() => []);
      const workHours = await api.getWorkHours(userId).catch(() => []);
      const projects = await api.getProjects(userId).catch(() => []);

      const totalHours = workHours.reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);
      const totalProjects = projects?.length || 0;
      console.log("💾 totalHours:", totalHours, "totalProjects:", totalProjects);

      let unlockedCount = 0;
      const certsWithRules = await Promise.all(
        certs.map(async (cert: any) => {
          const templates = await api.getCertificateTemplates().catch(() => []);
          const template = templates.find((t: any) => t.title === cert.title);

          const rules = template ? await api.getCertificateUnlockRules(template.id).catch(() => []) : [];
          console.log(`🏆 ${cert.title} - rules:`, rules);

          let requirementText = "Splnění kritérií";
          let hasManualRule = false;
          let shouldBeUnlocked = cert.locked === false;

          if (rules.length === 0) {
            requirementText = "Bez kritérií";
          } else {
            const descriptions: string[] = [];
            for (const rule of rules) {
              if (rule.rule_type === "MANUAL") {
                descriptions.push("Odemknutí mistrem");
                hasManualRule = true;
              } else if (rule.condition_type === "WORK_HOURS") {
                descriptions.push(`Odpracuj ${rule.condition_value} hodin`);
                if (totalHours >= rule.condition_value) shouldBeUnlocked = true;
              } else if (rule.condition_type === "PROJECTS") {
                descriptions.push(`Dokončeno ${rule.condition_value} projektů`);
                if (totalProjects >= rule.condition_value) shouldBeUnlocked = true;
              }
            }
            requirementText = descriptions.join(" • ");
          }

          if (shouldBeUnlocked) unlockedCount++;
          const result = { ...cert, locked: !shouldBeUnlocked, requirement: requirementText, hasManualRule };
          console.log(`  ✅ ${cert.title}: requirement="${requirementText}"`);
          return result;
        })
      );

      console.log("📋 certsWithRules:", certsWithRules);
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
        try {
          projects = (await api.getProjects(apprenticeId)) || [];
          workHours = (await api.getWorkHours(apprenticeId)) || [];
          certs = (await api.getCertificates(apprenticeId)) || [];
        } catch (e) {
          console.log("API fallback to local storage");
          projects = userData.projects || [];
          workHours = userData.workHours || [];
          certs = userData.certificates || [];
        }

        const totalHours = workHours.reduce((sum: number, h: any) => sum + (h.hours || h.duration || 0), 0);
        const totalProjects = projects?.length || 0;

        // Přepočítej pravidla pro certifikáty
        let certificatesWithRules = certs;
        try {
          certificatesWithRules = await Promise.all(
            certs.map(async (cert: any) => {
              const template = await api.getCertificateTemplates()
                .then(templates => templates.find((t: any) => t.title === cert.title))
                .catch(() => null);

              const rules = template ? await api.getCertificateUnlockRules(template.id).catch(() => []) : [];

              let requirementText = "Splnění kritérií";
              let hasManualRule = false;
              let shouldBeUnlocked = cert.locked === false;

              if (rules.length === 0) {
                requirementText = "Bez kritérií";
              } else {
                const descriptions: string[] = [];
                for (const rule of rules) {
                  if (rule.rule_type === "MANUAL") {
                    descriptions.push("Odemknutí mistrem");
                    hasManualRule = true;
                  } else if (rule.condition_type === "WORK_HOURS") {
                    descriptions.push(`Odpracuj ${rule.condition_value} hodin`);
                    if (totalHours >= rule.condition_value) shouldBeUnlocked = true;
                  } else if (rule.condition_type === "PROJECTS") {
                    descriptions.push(`Dokončeno ${rule.condition_value} projektů`);
                    if (totalProjects >= rule.condition_value) shouldBeUnlocked = true;
                  }
                }
                requirementText = descriptions.join(" • ");
              }

              return { ...cert, locked: !shouldBeUnlocked, requirement: requirementText, hasManualRule };
            })
          );
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
        // ULOŽ do AsyncStorage aby to ostatní stránky mohly číst!
        await AsyncStorage.setItem("masterSelectedApprenticeData", JSON.stringify(selectedData));
      }
    } catch (error) {
      console.error("❌ Chyba při načítání dat učedníka:", error);
    }
  };

  const totalHours = getTotalHours();

  const ProfileItem = ({ icon, label, value, onPress }: any) => (
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
        <ThemedText style={[styles.itemValue, { color: theme.textSecondary }]}>
          {value}
        </ThemedText>
      ) : (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      )}
    </Pressable>
  );

  const BadgeDetailModal = () => {
    if (!selectedBadge) return null;
    const badgeColor = selectedBadge.category === "Badge" ? theme.primary : theme.secondary;

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
        paddingBottom: insets.bottom + Spacing.xl,
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
        <ThemedText style={[styles.role, { color: theme.textSecondary }]}>
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
        <ProfileItem icon="tag" label="Role" value={user?.role} />
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
                <ProfileItem icon="folder" label="Projekty" value={String(selectedApprenticeData.projectCount)} />
                <ProfileItem icon="award" label="Certifikáty" value={String(selectedApprenticeData.unlockedCerts)} />
              </>
            ) : (
              <>
                <ProfileItem icon="clock" label="Celkem hodin" value={`${totalHours}h`} />
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
                <ProfileItem icon="target" label="Týdenní cíl" onPress={() => setGoalModalVisible(true)} />
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

      {/* Grid s detailem certifikátů */}
      {apprenticeCerts && apprenticeCerts.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            CERTIFIKÁTY DETAIL
          </ThemedText>
          <View style={styles.certificatesGrid}>
            {apprenticeCerts.map((cert: any, idx: number) => (
              <Pressable
                key={idx}
                onPress={() => setSelectedBadge(cert)}
                style={({ pressed }) => [
                  styles.certCard,
                  {
                    backgroundColor: cert.locked ? theme.backgroundDefault : theme.primary + "20",
                    opacity: pressed ? 0.7 : 1,
                    borderColor: cert.locked ? theme.border : theme.primary,
                  },
                ]}
              >
                <Feather
                  name={cert.locked ? "lock" : "award"}
                  size={24}
                  color={cert.locked ? theme.textSecondary : theme.primary}
                />
                <ThemedText style={[styles.certTitle, { color: theme.text }]} numberOfLines={2}>
                  {cert.title}
                </ThemedText>
                {cert.hasManualRule && (
                  <ThemedText style={{ fontSize: 12, color: theme.primary }}>★</ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

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
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nastavit cile</ThemedText>
              <Pressable onPress={() => setGoalModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

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
                    }
                  ]}
                >
                  <ThemedText style={{ color: goalPeriod === p ? "#fff" : theme.text, fontWeight: "600" }}>
                    {p === "week" ? "Tyden" : p === "month" ? "Mesic" : "Rok"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              <View style={styles.goalInputContainer}>
                {goalPeriod === "week" && (
                  <>
                    <ThemedText style={[styles.goalLabel, { color: theme.text }]}>
                      Prace (max {adminSettings.max_work_hours_week}h)
                    </ThemedText>
                    <TextInput
                      style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                      value={workGoalWeek}
                      onChangeText={setWorkGoalWeek}
                      keyboardType="numeric"
                      placeholder="20"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <ThemedText style={[styles.goalLabel, { color: theme.text, marginTop: Spacing.md }]}>
                      Studium (max {adminSettings.max_study_hours_week}h)
                    </ThemedText>
                    <TextInput
                      style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                      value={studyGoalWeek}
                      onChangeText={setStudyGoalWeek}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </>
                )}
                {goalPeriod === "month" && (
                  <>
                    <ThemedText style={[styles.goalLabel, { color: theme.text }]}>
                      Prace (max {adminSettings.max_work_hours_month}h)
                    </ThemedText>
                    <TextInput
                      style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                      value={workGoalMonth}
                      onChangeText={setWorkGoalMonth}
                      keyboardType="numeric"
                      placeholder="80"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <ThemedText style={[styles.goalLabel, { color: theme.text, marginTop: Spacing.md }]}>
                      Studium (max {adminSettings.max_study_hours_month}h)
                    </ThemedText>
                    <TextInput
                      style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                      value={studyGoalMonth}
                      onChangeText={setStudyGoalMonth}
                      keyboardType="numeric"
                      placeholder="40"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </>
                )}
                {goalPeriod === "year" && (
                  <>
                    <ThemedText style={[styles.goalLabel, { color: theme.text }]}>
                      Prace (max {adminSettings.max_work_hours_year}h)
                    </ThemedText>
                    <TextInput
                      style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                      value={workGoalYear}
                      onChangeText={setWorkGoalYear}
                      keyboardType="numeric"
                      placeholder="960"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <ThemedText style={[styles.goalLabel, { color: theme.text, marginTop: Spacing.md }]}>
                      Studium (max {adminSettings.max_study_hours_year}h)
                    </ThemedText>
                    <TextInput
                      style={[styles.goalInput, { backgroundColor: theme.backgroundRoot, borderColor: theme.border, color: theme.text }]}
                      value={studyGoalYear}
                      onChangeText={setStudyGoalYear}
                      keyboardType="numeric"
                      placeholder="480"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.createButton,
                    { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1, marginTop: Spacing.lg }
                  ]}
                  onPress={async () => {
                    try {
                      const goals: ApprenticeGoals = {
                        work_goal_week: parseInt(workGoalWeek) || 20,
                        study_goal_week: parseInt(studyGoalWeek) || 10,
                        work_goal_month: parseInt(workGoalMonth) || 80,
                        study_goal_month: parseInt(studyGoalMonth) || 40,
                        work_goal_year: parseInt(workGoalYear) || 960,
                        study_goal_year: parseInt(studyGoalYear) || 480,
                      };
                      await saveApprenticeGoals(goals);
                      setGoalModalVisible(false);
                    } catch (error) {
                      console.error("Chyba pri ukladani cilu:", error);
                    }
                  }}
                >
                  <ThemedText style={styles.createText}>Ulozit cile</ThemedText>
                </Pressable>
              </View>
            </ScrollView>
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
    </ScrollView>
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
  role: {
    ...Typography.body,
    marginBottom: Spacing.xs,
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
    paddingVertical: Spacing.md,
    ...Typography.body,
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
