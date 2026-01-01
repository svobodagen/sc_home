import React, { useState, useEffect } from "react";
import { View, Pressable, FlatList, StyleSheet, Alert, ScrollView, TextInput, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useMaster } from "@/contexts/MasterContext";
import { useData } from "@/contexts/DataContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Colors, Spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";

interface MasterWithApprentices {
  master: any;
  apprentices: any[];
}

export default function AdminScreen() {
  const { theme } = useTheme();
  const { user, getAllUsers, deleteUser, resetUserData } = useAuth();
  const { addApprenticeToMaster, removeApprenticeFromMaster, getMasterApprentices } = useMaster();
  const { adminSettings, saveAdminSettings } = useData();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "relationships" | "certificates" | "settings">("users");
  const [mastersData, setMastersData] = useState<MasterWithApprentices[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<string>("");
  const [availableApprentices, setAvailableApprentices] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState<number | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [showAddCertForm, setShowAddCertForm] = useState(false);
  const [newCertTitle, setNewCertTitle] = useState("");
  const [newCertCategory, setNewCertCategory] = useState<"Badge" | "Certifikát">("Badge");
  const [newCertPoints, setNewCertPoints] = useState("0");
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [ruleType, setRuleType] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [conditionType, setConditionType] = useState<string>("NONE");
  const [conditionValue, setConditionValue] = useState("");
  const [resetConfirmModal, setResetConfirmModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<string>("");
  const [resetUserEmail, setResetUserEmail] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string>("");
  const [deleteUserEmail, setDeleteUserEmail] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [editCredsModal, setEditCredsModal] = useState(false);
  const [editCredsUserId, setEditCredsUserId] = useState<string>("");
  const [editCredsUserEmail, setEditCredsUserEmail] = useState<string>("");
  const [editCredsName, setEditCredsName] = useState("");
  const [editCredsEmail, setEditCredsEmail] = useState("");
  const [editCredsPassword, setEditCredsPassword] = useState("");
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [editCertModal, setEditCertModal] = useState(false);
  const [editCertId, setEditCertId] = useState<number | null>(null);
  const [editCertTitle, setEditCertTitle] = useState("");
  const [editCertPoints, setEditCertPoints] = useState("");
  const [isSavingCert, setIsSavingCert] = useState(false);
  const [settingsWorkDay, setSettingsWorkDay] = useState("");
  const [settingsStudyDay, setSettingsStudyDay] = useState("");
  const [settingsWorkWeek, setSettingsWorkWeek] = useState("");
  const [settingsStudyWeek, setSettingsStudyWeek] = useState("");
  const [settingsWorkMonth, setSettingsWorkMonth] = useState("");
  const [settingsStudyMonth, setSettingsStudyMonth] = useState("");
  const [settingsWorkYear, setSettingsWorkYear] = useState("");
  const [settingsStudyYear, setSettingsStudyYear] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [editLimitsModal, setEditLimitsModal] = useState(false);
  const [editLimitsUserId, setEditLimitsUserId] = useState("");
  const [editLimitsUserName, setEditLimitsUserName] = useState("");
  const [limitsWorkDay, setLimitsWorkDay] = useState("");
  const [limitsStudyDay, setLimitsStudyDay] = useState("");
  const [limitsWorkWeek, setLimitsWorkWeek] = useState("");
  const [limitsStudyWeek, setLimitsStudyWeek] = useState("");
  const [limitsWorkMonth, setLimitsWorkMonth] = useState("");
  const [limitsStudyMonth, setLimitsStudyMonth] = useState("");
  const [limitsWorkYear, setLimitsWorkYear] = useState("");
  const [limitsStudyYear, setLimitsStudyYear] = useState("");
  const [isSavingLimits, setIsSavingLimits] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "Učedník" | "Mistr" | "Host" | "Admin">("all");

  const filteredUsers = roleFilter === "all"
    ? users
    : users.filter(u => u.role === roleFilter);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "relationships") {
      loadMastersAndApprentices();
    } else if (activeTab === "certificates") {
      loadCertificates();
    } else if (activeTab === "settings") {
      setSettingsWorkDay(String(adminSettings.max_work_hours_day));
      setSettingsStudyDay(String(adminSettings.max_study_hours_day));
      setSettingsWorkWeek(String(adminSettings.max_work_hours_week));
      setSettingsStudyWeek(String(adminSettings.max_study_hours_week));
      setSettingsWorkMonth(String(adminSettings.max_work_hours_month));
      setSettingsStudyMonth(String(adminSettings.max_study_hours_month));
      setSettingsWorkYear(String(adminSettings.max_work_hours_year || 1920));
      setSettingsStudyYear(String(adminSettings.max_study_hours_year || 960));
    }
  }, [activeTab, adminSettings]);

  useEffect(() => {
    if (selectedMaster) {
      loadAvailableApprentices();
    }
  }, [selectedMaster, mastersData]);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Chyba při načítání uživatelů:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMastersAndApprentices = async () => {
    try {
      const allUsers = await getAllUsers();
      const masters = allUsers.filter((u: any) => u.role === "Mistr");

      const mastersWithApprentices: MasterWithApprentices[] = await Promise.all(
        masters.map(async (master: any) => ({
          master,
          apprentices: await getMasterApprentices(master.id),
        }))
      );

      setMastersData(mastersWithApprentices);

      // Preserve selection if the master still exists, otherwise select the first one
      const masterExists = mastersWithApprentices.some(m => m.master.id === selectedMaster);
      if (mastersWithApprentices.length > 0 && (!selectedMaster || !masterExists)) {
        setSelectedMaster(mastersWithApprentices[0].master.id);
      }
    } catch (error) {
      console.error("Chyba při načítání mistů:", error);
    }
  };

  const loadAvailableApprentices = async () => {
    try {
      console.log("📥 loadAvailableApprentices start, selectedMaster:", selectedMaster, "mastersData length:", mastersData.length);
      const allUsers = await getAllUsers();
      const apprentices = allUsers.filter((u: any) => u.role === "Učedník");
      console.log("📚 Všichni učedníci:", apprentices.length);

      // Najdi aktuálního mistra
      let currentMaster = mastersData.find(m => m.master.id === selectedMaster);
      console.log("🎯 currentMaster found:", !!currentMaster, "name:", currentMaster?.master.name);

      // Pokud se nenajde v mastersData, načti ho znovu
      if (!currentMaster) {
        console.log("⚠️ currentMaster nenajden! Reloaduju...");
        await loadMastersAndApprentices();
        currentMaster = mastersData.find(m => m.master.id === selectedMaster);
      }

      const assignedIds = currentMaster?.apprentices?.map((a: any) => a.apprenticeId) || [];
      console.log("✓ Přiřazená ID:", assignedIds);
      const available = apprentices.filter((a: any) => !assignedIds.includes(a.id));
      console.log("✅ Dostupní učedníci:", available.length, available.map((a: any) => a.name));
      setAvailableApprentices(available);
    } catch (error) {
      console.error("❌ Chyba v loadAvailableApprentices:", error);
      setAvailableApprentices([]);
    }
  };

  const loadCertificates = async () => {
    try {
      setCertLoading(true);
      const certs = await api.getCertificateTemplates();
      setCertificates(certs);
      if (certs.length > 0 && !selectedCertId) {
        setSelectedCertId(certs[0].id);
      }
    } catch (error) {
      console.error("Chyba při načítání certifikátů:", error);
    } finally {
      setCertLoading(false);
    }
  };

  const loadRules = async (templateId: number) => {
    try {
      const rulesList = await api.getCertificateUnlockRules(templateId);
      setRules(rulesList);
    } catch (error) {
      console.error("Chyba při načítání pravidel:", error);
    }
  };

  const handleAddCertificate = async () => {
    if (!newCertTitle.trim()) {
      Alert.alert("Chyba", "Vyplň název certifikátu");
      return;
    }
    try {
      await api.addCertificateTemplate(newCertTitle, newCertCategory, parseInt(newCertPoints) || 0, "");
      setNewCertTitle("");
      setNewCertPoints("0");
      setShowAddCertForm(false);
      await loadCertificates();
    } catch (error) {
      Alert.alert("Chyba", "Nepodařilo se přidat certifikát");
    }
  };

  const handleAddRule = async () => {
    if (!selectedCertId) return;
    try {
      await api.addCertificateUnlockRule(
        selectedCertId,
        ruleType,
        ruleType === "AUTO" ? conditionType : null,
        ruleType === "AUTO" && conditionValue ? parseInt(conditionValue) : null,
        `${ruleType === "MANUAL" ? "Aktivace mistrem" : `${conditionType}: ${conditionValue}`}`
      );
      setShowAddRuleForm(false);
      setConditionValue("");
      await loadRules(selectedCertId);
    } catch (error) {
      Alert.alert("Chyba", "Nepodařilo se přidat pravidlo");
    }
  };

  const handleEditCert = (certId: number, title: string, points: number) => {
    setEditCertId(certId);
    setEditCertTitle(title);
    setEditCertPoints(String(points));
    setEditCertModal(true);
  };

  const handleSaveEditCert = async () => {
    if (!editCertId || !editCertTitle.trim()) return;
    setIsSavingCert(true);
    try {
      await api.updateCertificateTemplate(editCertId, editCertTitle, parseInt(editCertPoints) || 0);
      setEditCertModal(false);
      await loadCertificates();
    } catch (error: any) {
      Alert.alert("Chyba", "Nepodařilo se aktualizovat certifikát");
    } finally {
      setIsSavingCert(false);
    }
  };

  const handleDeleteCert = async (certId: number) => {
    console.log("🗑️ Kliknutí na delete, certId:", certId);
    try {
      await api.deleteCertificateTemplate(certId);
      console.log("✅ Certifikát smazán, reloaduji...");
      await loadCertificates();
      setSelectedCertId(null);
      setRules([]);
    } catch (error: any) {
      console.error("❌ Chyba při mazání certifikátu:", error);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    console.log("🗑️ Kliknutí na delete pravidla, ruleId:", ruleId);
    try {
      await api.deleteCertificateUnlockRule(ruleId);
      console.log("✅ Pravidlo smazáno, reloaduji...");
      if (selectedCertId) await loadRules(selectedCertId);
    } catch (error: any) {
      console.error("❌ Chyba při mazání pravidla:", error);
    }
  };

  const handleAddApprenticeToMaster = async (apprenticeId: string, apprenticeName: string, apprenticeEmail: string) => {
    try {
      console.log("🔗 Přidávám učedníka:", { apprenticeId, apprenticeName, selectedMaster });
      await addApprenticeToMaster(selectedMaster, apprenticeId, apprenticeName, apprenticeEmail);
      console.log("✅ Přidáno, reloaduji data...");
      await loadMastersAndApprentices();
      await loadAvailableApprentices();
      console.log("✅ Reload hotov");
    } catch (error) {
      console.error("❌ Chyba při přidávání učedníka:", error);
      Alert.alert("Chyba", `Nepodařilo se přidat učedníka: ${error}`);
    }
  };

  const handleRemoveApprenticeFromMaster = async (apprenticeId: string, apprenticeName: string) => {
    try {
      await removeApprenticeFromMaster(selectedMaster, apprenticeId);
      await loadMastersAndApprentices();
      await loadAvailableApprentices();
    } catch (error) {
      console.error("Chyba při odebírání učedníka:", error);
    }
  };

  const handleDeleteUser = (userId: string, userEmail: string) => {
    setDeleteUserId(userId);
    setDeleteUserEmail(userEmail);
    setDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    setDeleteConfirmModal(false);
    setIsDeleting(true);
    try {
      await deleteUser(deleteUserId);
      await loadUsers();
      Alert.alert("Úspěch", "Uživatel byl smazán");
    } catch (error) {
      Alert.alert("Chyba", "Nepodařilo se smazat uživatele");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditCreds = (userId: string, email: string, name: string) => {
    setEditCredsUserId(userId);
    setEditCredsUserEmail(email);
    setEditCredsName(name);
    setEditCredsEmail(email);
    setEditCredsPassword("");
    setEditCredsModal(true);
  };

  const confirmSaveCreds = async () => {
    if (!editCredsName.trim() && !editCredsEmail.trim() && !editCredsPassword.trim()) {
      Alert.alert("Chyba", "Vyplň alespoň jméno, email nebo heslo");
      return;
    }
    setEditCredsModal(false);
    setIsSavingCreds(true);
    try {
      const updates: any = {};
      if (editCredsName.trim()) updates.name = editCredsName;
      if (editCredsEmail.trim() && editCredsEmail !== editCredsUserEmail) updates.email = editCredsEmail;
      if (editCredsPassword.trim()) updates.password = editCredsPassword;

      if (Object.keys(updates).length > 0) {
        await api.updateUser(editCredsUserId, updates);
        await loadUsers();
      }
      Alert.alert("Úspěch", "Údaje byly aktualizovány");
    } catch (error) {
      Alert.alert("Chyba", "Nepodařilo se aktualizovat údaje");
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleResetData = async (userId: string, userEmail: string) => {
    console.log("🔄 handleResetData - userId:", userId, "email:", userEmail);
    setResetUserId(userId);
    setResetUserEmail(userEmail);
    setResetConfirmModal(true);
  };

  const confirmReset = async () => {
    setResetConfirmModal(false);
    setIsResetting(true);
    console.log("⏳ Resetuji data...");
    try {
      const result: any = await resetUserData(resetUserId);
      console.log("✅ Reset výsledek:", result);
      await loadUsers();
      const hoursCount = result?.hoursCount || 0;
      const projectsCount = result?.projectsCount || 0;
      console.log("📊 Počty:", hoursCount, projectsCount);
      Alert.alert(
        "Úspěch",
        `Data resetována:\n- Smazáno ${hoursCount} hodin\n- Smazáno ${projectsCount} projektů`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("❌ Chyba při resetu:", error);
      Alert.alert("Chyba", `Nepodařilo se resetovat data: ${error.message || error}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveAdminSettings({
        max_work_hours_day: parseFloat(settingsWorkDay) || 8,
        max_study_hours_day: parseFloat(settingsStudyDay) || 4,
        max_work_hours_week: parseFloat(settingsWorkWeek) || 40,
        max_study_hours_week: parseFloat(settingsStudyWeek) || 20,
        max_work_hours_month: parseFloat(settingsWorkMonth) || 160,
        max_study_hours_month: parseFloat(settingsStudyMonth) || 80,
        max_work_hours_year: parseFloat(settingsWorkYear) || 1920,
        max_study_hours_year: parseFloat(settingsStudyYear) || 960,
      });
      Alert.alert("Uloženo", "Nastavení limitů bylo uloženo");
    } catch (error: any) {
      Alert.alert("Chyba", "Nepodařilo se uložit nastavení");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const openEditLimitsModal = async (userId: string, userName: string) => {
    setEditLimitsUserId(userId);
    setEditLimitsUserName(userName);

    try {
      const limits = await api.getUserHourLimits(userId);
      if (limits) {
        setLimitsWorkDay(String(limits.max_work_hours_day));
        setLimitsStudyDay(String(limits.max_study_hours_day));
        setLimitsWorkWeek(String(limits.max_work_hours_week));
        setLimitsStudyWeek(String(limits.max_study_hours_week));
        setLimitsWorkMonth(String(limits.max_work_hours_month));
        setLimitsStudyMonth(String(limits.max_study_hours_month));
        setLimitsWorkYear(String(limits.max_work_hours_year));
        setLimitsStudyYear(String(limits.max_study_hours_year));
      } else {
        setLimitsWorkDay(String(adminSettings.max_work_hours_day));
        setLimitsStudyDay(String(adminSettings.max_study_hours_day));
        setLimitsWorkWeek(String(adminSettings.max_work_hours_week));
        setLimitsStudyWeek(String(adminSettings.max_study_hours_week));
        setLimitsWorkMonth(String(adminSettings.max_work_hours_month));
        setLimitsStudyMonth(String(adminSettings.max_study_hours_month));
        setLimitsWorkYear(String(adminSettings.max_work_hours_year || 1920));
        setLimitsStudyYear(String(adminSettings.max_study_hours_year || 960));
      }
    } catch (error) {
      setLimitsWorkDay("8");
      setLimitsStudyDay("4");
      setLimitsWorkWeek("40");
      setLimitsStudyWeek("20");
      setLimitsWorkMonth("160");
      setLimitsStudyMonth("80");
      setLimitsWorkYear("1920");
      setLimitsStudyYear("960");
    }

    setEditLimitsModal(true);
  };

  const handleSaveLimits = async () => {
    setIsSavingLimits(true);
    try {
      await api.updateUserHourLimits(editLimitsUserId, {
        max_work_hours_day: parseFloat(limitsWorkDay) || 8,
        max_study_hours_day: parseFloat(limitsStudyDay) || 4,
        max_work_hours_week: parseFloat(limitsWorkWeek) || 40,
        max_study_hours_week: parseFloat(limitsStudyWeek) || 20,
        max_work_hours_month: parseFloat(limitsWorkMonth) || 160,
        max_study_hours_month: parseFloat(limitsStudyMonth) || 80,
        max_work_hours_year: parseFloat(limitsWorkYear) || 1920,
        max_study_hours_year: parseFloat(limitsStudyYear) || 960,
      });
      Alert.alert("Uloženo", "Limity učedníka byly uloženy");
      setEditLimitsModal(false);
    } catch (error: any) {
      Alert.alert("Chyba", "Nepodařilo se uložit limity");
    } finally {
      setIsSavingLimits(false);
    }
  };

  const renderUser = ({ item }: { item: any }) => (
    <ThemedView style={styles.userCard}>
      <View style={styles.userInfo}>
        <ThemedText style={styles.userName}>{item.name}</ThemedText>
        <ThemedText style={styles.userEmail}>{item.email}</ThemedText>
        <ThemedText style={styles.userPassword}>Heslo: {item.password}</ThemedText>
        <ThemedText style={styles.userRole}>Role: {item.role}</ThemedText>
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            styles.resetButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => handleResetData(item.id, item.email)}
        >
          <Feather name="refresh-cw" size={18} color="#fff" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            styles.editButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => handleEditCreds(item.id, item.email, item.name)}
        >
          <Feather name="edit-2" size={18} color="#fff" />
        </Pressable>

        {item.role === "Učedník" && (
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              styles.limitsButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => openEditLimitsModal(item.id, item.name)}
          >
            <Feather name="clock" size={18} color="#fff" />
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            styles.deleteButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => handleDeleteUser(item.id, item.email)}
        >
          <Feather name="trash-2" size={18} color="#fff" />
        </Pressable>
      </View>
    </ThemedView>
  );

  if (user?.role !== "Admin") {
    return (
      <ScreenKeyboardAwareScrollView>
        <View style={styles.container}>
          <ThemedText style={styles.errorText}>Přístup zamítnut - pouze pro administrátory</ThemedText>
        </View>
      </ScreenKeyboardAwareScrollView>
    );
  }

  const currentMaster = mastersData.find(m => m.master.id === selectedMaster);

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.container}>
        <ThemedText style={styles.title}>Admin panel</ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "users" && styles.activeTab]}
            onPress={() => setActiveTab("users")}
          >
            <ThemedText style={activeTab === "users" ? styles.activeTabText : styles.tabText}>
              Uživatelé
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "relationships" && styles.activeTab]}
            onPress={() => setActiveTab("relationships")}
          >
            <ThemedText style={activeTab === "relationships" ? styles.activeTabText : styles.tabText}>
              Propojení
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "certificates" && styles.activeTab]}
            onPress={() => setActiveTab("certificates")}
          >
            <ThemedText style={activeTab === "certificates" ? styles.activeTabText : styles.tabText}>
              Odznaky
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "settings" && styles.activeTab]}
            onPress={() => setActiveTab("settings")}
          >
            <ThemedText style={activeTab === "settings" ? styles.activeTabText : styles.tabText}>
              Nastaveni
            </ThemedText>
          </Pressable>
        </ScrollView>

        {activeTab === "users" && (
          <>
            <ThemedText style={styles.subtitle}>Registrovaní uživatelé ({filteredUsers.length}/{users.length})</ThemedText>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilterContainer}>
              {(["all", "Host", "Učedník", "Mistr", "Admin"] as const).map((role) => (
                <Pressable
                  key={role}
                  style={[
                    styles.roleFilterBtn,
                    {
                      backgroundColor: roleFilter === role ? theme.primary : theme.backgroundDefault,
                      borderColor: roleFilter === role ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => setRoleFilter(role)}
                >
                  <ThemedText style={{ color: roleFilter === role ? "#fff" : theme.text, fontSize: 13, fontWeight: "600" }}>
                    {role === "all" ? "Vše" : role}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            {loading ? (
              <ThemedText>Načítání...</ThemedText>
            ) : filteredUsers.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Feather name="users" size={40} color={theme.textSecondary} />
                <ThemedText style={styles.emptyText}>Žádní uživatelé v této kategorii</ThemedText>
              </ThemedView>
            ) : (
              <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
              />
            )}
          </>
        )}

        {activeTab === "certificates" && (
          <>
            <View style={styles.certHeader}>
              <ThemedText style={styles.subtitle}>Správa certifikátů a pravidel</ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => setShowAddCertForm(!showAddCertForm)}
              >
                <Feather name="plus" size={18} color="#fff" />
              </Pressable>
            </View>

            {showAddCertForm && (
              <ThemedView style={styles.formCard}>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Název certifikátu"
                  placeholderTextColor={theme.textSecondary}
                  value={newCertTitle}
                  onChangeText={setNewCertTitle}
                />
                <View style={styles.formRow}>
                  <Pressable
                    style={[
                      styles.categoryBtn,
                      newCertCategory === "Badge" && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setNewCertCategory("Badge")}
                  >
                    <ThemedText style={{ color: newCertCategory === "Badge" ? "#fff" : theme.text }}>
                      Odznak
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.categoryBtn,
                      newCertCategory === "Certifikát" && { backgroundColor: theme.secondary },
                    ]}
                    onPress={() => setNewCertCategory("Certifikát")}
                  >
                    <ThemedText style={{ color: newCertCategory === "Certifikát" ? "#fff" : theme.text }}>
                      Certifikát
                    </ThemedText>
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Body"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={newCertPoints}
                  onChangeText={setNewCertPoints}
                />
                <View style={styles.formRow}>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                    onPress={handleAddCertificate}
                  >
                    <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Přidat</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: theme.border }]}
                    onPress={() => setShowAddCertForm(false)}
                  >
                    <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Zrušit</ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            )}

            {certLoading ? (
              <ThemedText>Načítání...</ThemedText>
            ) : certificates.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Feather name="award" size={40} color={theme.textSecondary} />
                <ThemedText style={styles.emptyText}>Žádné certifikáty</ThemedText>
              </ThemedView>
            ) : (
              <>
                {certificates.filter((c: any) => c.category === "Badge").length > 0 && (
                  <>
                    <ThemedText style={styles.certListLabel}>Odznaky:</ThemedText>
                    <FlatList
                      data={certificates.filter((c: any) => c.category === "Badge")}
                      renderItem={({ item }) => (
                        <View
                          style={[
                            styles.certItem,
                            { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                            selectedCertId === item.id ? {
                              borderColor: theme.primary,
                              borderWidth: 3,
                              backgroundColor: theme.primary + "15"
                            } : { borderColor: theme.border },
                          ]}
                        >
                          <Pressable
                            style={{ flex: 1 }}
                            onPress={() => {
                              setSelectedCertId(item.id);
                              loadRules(item.id);
                            }}
                          >
                            <ThemedText style={[styles.certTitle, selectedCertId === item.id && { fontWeight: "bold", color: theme.primary }]}>{item.title}</ThemedText>
                            <ThemedText style={[styles.certMeta, { color: theme.textSecondary }]}>
                              {item.points} bodů
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => handleEditCert(item.id, item.title, item.points)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="edit-2" size={16} color={theme.primary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteCert(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ marginLeft: Spacing.md }}
                          >
                            <Feather name="trash-2" size={16} color={theme.error} />
                          </Pressable>
                        </View>
                      )}
                      keyExtractor={(item) => String(item.id)}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                    />
                  </>
                )}

                {certificates.filter((c: any) => c.category === "Certifikát").length > 0 && (
                  <>
                    <ThemedText style={[styles.certListLabel, { marginTop: Spacing.lg }]}>Certifikáty:</ThemedText>
                    <FlatList
                      data={certificates.filter((c: any) => c.category === "Certifikát")}
                      renderItem={({ item }) => (
                        <View
                          style={[
                            styles.certItem,
                            { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                            selectedCertId === item.id ? {
                              borderColor: theme.primary,
                              borderWidth: 3,
                              backgroundColor: theme.primary + "15"
                            } : { borderColor: theme.border },
                          ]}
                        >
                          <Pressable
                            style={{ flex: 1 }}
                            onPress={() => {
                              setSelectedCertId(item.id);
                              loadRules(item.id);
                            }}
                          >
                            <ThemedText style={[styles.certTitle, selectedCertId === item.id && { fontWeight: "bold", color: theme.primary }]}>{item.title}</ThemedText>
                            <ThemedText style={[styles.certMeta, { color: theme.textSecondary }]}>
                              {item.points} bodů
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => handleEditCert(item.id, item.title, item.points)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="edit-2" size={16} color={theme.primary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteCert(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ marginLeft: Spacing.md }}
                          >
                            <Feather name="trash-2" size={16} color={theme.error} />
                          </Pressable>
                        </View>
                      )}
                      keyExtractor={(item) => String(item.id)}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                    />
                  </>
                )}

                {selectedCertId && (
                  <ThemedView style={[styles.formCard, { marginTop: Spacing.lg }]}>
                    {/* Vybraný odznak/certifikát */}
                    {certificates.find((c: any) => c.id === selectedCertId) && (
                      <View style={[styles.certItem, { marginBottom: Spacing.lg, borderWidth: 2, borderColor: theme.primary }]}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.certTitle, { color: theme.primary, fontWeight: "bold" }]}>
                            {certificates.find((c: any) => c.id === selectedCertId)?.title}
                          </ThemedText>
                          <ThemedText style={[styles.certMeta, { color: theme.textSecondary }]}>
                            {certificates.find((c: any) => c.id === selectedCertId)?.points} bodů
                          </ThemedText>
                        </View>
                      </View>
                    )}

                    <View style={styles.rulesHeader}>
                      <ThemedText style={styles.rulesTitle}>Pravidla odemknutí:</ThemedText>
                      <Pressable
                        style={({ pressed }) => [
                          styles.addButton,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                        onPress={() => setShowAddRuleForm(!showAddRuleForm)}
                      >
                        <Feather name="plus" size={16} color="#fff" />
                      </Pressable>
                    </View>

                    {showAddRuleForm && (
                      <ThemedView style={styles.formCard}>
                        <View style={styles.formRow}>
                          <Pressable
                            style={[
                              styles.ruleTypeBtn,
                              ruleType === "MANUAL" && { backgroundColor: theme.primary },
                              { borderColor: theme.border },
                            ]}
                            onPress={() => setRuleType("MANUAL")}
                          >
                            <ThemedText style={{ color: ruleType === "MANUAL" ? "#fff" : theme.text, fontSize: 12 }}>
                              A: MISTR
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.ruleTypeBtn,
                              ruleType === "AUTO" && { backgroundColor: theme.secondary },
                              { borderColor: theme.border },
                            ]}
                            onPress={() => setRuleType("AUTO")}
                          >
                            <ThemedText style={{ color: ruleType === "AUTO" ? "#fff" : theme.text, fontSize: 12 }}>
                              B: AUTO
                            </ThemedText>
                          </Pressable>
                        </View>

                        {ruleType === "AUTO" && (
                          <>
                            <View style={styles.formRow}>
                              <Pressable
                                style={[
                                  styles.condBtn,
                                  conditionType === "WORK_HOURS" && { backgroundColor: theme.primary },
                                  { borderColor: theme.border },
                                ]}
                                onPress={() => setConditionType("WORK_HOURS")}
                              >
                                <ThemedText style={{ color: conditionType === "WORK_HOURS" ? "#fff" : theme.text, fontSize: 11 }}>
                                  Práce
                                </ThemedText>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.condBtn,
                                  conditionType === "STUDY_HOURS" && { backgroundColor: theme.secondary },
                                  { borderColor: theme.border },
                                ]}
                                onPress={() => setConditionType("STUDY_HOURS")}
                              >
                                <ThemedText style={{ color: conditionType === "STUDY_HOURS" ? "#fff" : theme.text, fontSize: 11 }}>
                                  Studium
                                </ThemedText>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.condBtn,
                                  conditionType === "TOTAL_HOURS" && { backgroundColor: theme.primary },
                                  { borderColor: theme.border },
                                ]}
                                onPress={() => setConditionType("TOTAL_HOURS")}
                              >
                                <ThemedText style={{ color: conditionType === "TOTAL_HOURS" ? "#fff" : theme.text, fontSize: 11 }}>
                                  Celkem
                                </ThemedText>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.condBtn,
                                  conditionType === "PROJECTS" && { backgroundColor: theme.secondary },
                                  { borderColor: theme.border },
                                ]}
                                onPress={() => setConditionType("PROJECTS")}
                              >
                                <ThemedText style={{ color: conditionType === "PROJECTS" ? "#fff" : theme.text, fontSize: 11 }}>
                                  Projekty
                                </ThemedText>
                              </Pressable>
                            </View>
                            <TextInput
                              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                              placeholder="Počet (hodin/projektů)"
                              placeholderTextColor={theme.textSecondary}
                              keyboardType="numeric"
                              value={conditionValue}
                              onChangeText={setConditionValue}
                            />
                          </>
                        )}

                        <View style={styles.formRow}>
                          <Pressable
                            style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                            onPress={handleAddRule}
                          >
                            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Přidat</ThemedText>
                          </Pressable>
                          <Pressable
                            style={[styles.submitBtn, { backgroundColor: theme.border }]}
                            onPress={() => setShowAddRuleForm(false)}
                          >
                            <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Zrušit</ThemedText>
                          </Pressable>
                        </View>
                      </ThemedView>
                    )}

                    {rules.length === 0 ? (
                      <ThemedText style={[styles.noRules, { color: theme.textSecondary }]}>
                        Žádná pravidla
                      </ThemedText>
                    ) : (
                      <FlatList
                        data={rules}
                        renderItem={({ item }) => (
                          <ThemedView style={[styles.ruleItem, { flexDirection: "row", alignItems: "center" }]}>
                            <View style={{ flex: 1 }}>
                              <ThemedText style={styles.ruleType}>
                                {item.rule_type === "MANUAL" ? "A - Odemknutí mistrem" : `B - Auto: ${item.condition_type}`}
                              </ThemedText>
                              {item.condition_value && (
                                <ThemedText style={[styles.ruleCondition, { color: theme.textSecondary }]}>
                                  Podmínka: {item.condition_value}
                                </ThemedText>
                              )}
                            </View>
                            <Pressable
                              onPress={() => handleDeleteRule(item.id)}
                              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, { padding: Spacing.sm }]}
                            >
                              <Feather name="trash-2" size={14} color={theme.error} />
                            </Pressable>
                          </ThemedView>
                        )}
                        keyExtractor={(item) => String(item.id)}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
                      />
                    )}
                  </ThemedView>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "relationships" && (
          <>
            <ThemedText style={styles.subtitle}>Propojení učedníků a mistů</ThemedText>

            {mastersData.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Feather name="users" size={40} color={theme.textSecondary} />
                <ThemedText style={styles.emptyText}>Žádní mistři v systému</ThemedText>
              </ThemedView>
            ) : (
              <>
                <ThemedView style={styles.masterSelector}>
                  <ThemedText style={styles.selectorLabel}>Vyber mistra:</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.masterList}>
                    {mastersData.map((item) => (
                      <Pressable
                        key={item.master.id}
                        style={[
                          styles.masterButton,
                          selectedMaster === item.master.id && styles.masterButtonActive,
                        ]}
                        onPress={() => setSelectedMaster(item.master.id)}
                      >
                        <ThemedText style={selectedMaster === item.master.id ? styles.masterButtonTextActive : styles.masterButtonText}>
                          {item.master.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </ThemedView>

                {currentMaster && (
                  <>
                    <ThemedText style={styles.subtitle}>
                      Učedníci mistra {currentMaster.master.name} ({currentMaster.apprentices.length})
                    </ThemedText>

                    {currentMaster.apprentices.length === 0 ? (
                      <ThemedView style={styles.emptyCard}>
                        <ThemedText style={styles.emptyText}>Žádní učedníci</ThemedText>
                      </ThemedView>
                    ) : (
                      <FlatList
                        data={currentMaster.apprentices}
                        renderItem={({ item }) => (
                          <ThemedView style={styles.apprenticeCard}>
                            <View style={styles.apprenticeInfo}>
                              <ThemedText style={styles.apprenticeName}>{item.apprenticeName}</ThemedText>
                              <ThemedText style={styles.apprenticeEmail}>{item.apprenticeEmail}</ThemedText>
                            </View>
                            <Pressable
                              style={({ pressed }) => [
                                styles.removeButton,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                              onPress={() =>
                                handleRemoveApprenticeFromMaster(item.apprenticeId, item.apprenticeName)
                              }
                            >
                              <Feather name="x" size={16} color="#fff" />
                            </Pressable>
                          </ThemedView>
                        )}
                        keyExtractor={(item) => item.apprenticeId}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                      />
                    )}

                    {availableApprentices.length > 0 && (
                      <>
                        <ThemedText style={[styles.subtitle, { marginTop: Spacing.lg }]}>
                          Dostupní učedníci
                        </ThemedText>
                        <FlatList
                          data={availableApprentices}
                          renderItem={({ item }) => (
                            <Pressable
                              style={({ pressed }) => [
                                styles.addApprenticeCard,
                                { opacity: pressed ? 0.7 : 1 },
                              ]}
                              onPress={() =>
                                handleAddApprenticeToMaster(item.id, item.name, item.email)
                              }
                            >
                              <View style={styles.apprenticeInfo}>
                                <ThemedText style={styles.apprenticeName}>{item.name}</ThemedText>
                                <ThemedText style={styles.apprenticeEmail}>{item.email}</ThemedText>
                              </View>
                              <Feather name="plus" size={20} color={Colors.light.primary} />
                            </Pressable>
                          )}
                          keyExtractor={(item) => item.id}
                          scrollEnabled={false}
                          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "settings" && (
          <>
            <ThemedText style={styles.subtitle}>Limity hodin</ThemedText>

            <ThemedView style={styles.settingsSection}>
              <ThemedText style={styles.settingsSectionTitle}>Denní limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsWorkDay}
                    onChangeText={setSettingsWorkDay}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsStudyDay}
                    onChangeText={setSettingsStudyDay}
                    keyboardType="numeric"
                    placeholder="4"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </ThemedView>

            <ThemedView style={styles.settingsSection}>
              <ThemedText style={styles.settingsSectionTitle}>Tydenni limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsWorkWeek}
                    onChangeText={setSettingsWorkWeek}
                    keyboardType="numeric"
                    placeholder="40"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsStudyWeek}
                    onChangeText={setSettingsStudyWeek}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </ThemedView>

            <ThemedView style={styles.settingsSection}>
              <ThemedText style={styles.settingsSectionTitle}>Mesicni limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsWorkMonth}
                    onChangeText={setSettingsWorkMonth}
                    keyboardType="numeric"
                    placeholder="160"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsStudyMonth}
                    onChangeText={setSettingsStudyMonth}
                    keyboardType="numeric"
                    placeholder="80"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </ThemedView>

            <ThemedView style={styles.settingsSection}>
              <ThemedText style={styles.settingsSectionTitle}>Rocni limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsWorkYear}
                    onChangeText={setSettingsWorkYear}
                    keyboardType="numeric"
                    placeholder="1920"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={settingsStudyYear}
                    onChangeText={setSettingsStudyYear}
                    keyboardType="numeric"
                    placeholder="960"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </ThemedView>

            <Pressable
              style={[styles.saveSettingsButton, isSavingSettings && { opacity: 0.5 }]}
              onPress={handleSaveSettings}
              disabled={isSavingSettings}
            >
              <Feather name="save" size={18} color="#fff" />
              <ThemedText style={styles.buttonText}>
                {isSavingSettings ? "Ukladam..." : "Ulozit nastaveni"}
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>

      <Modal
        visible={editLimitsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditLimitsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.modalTitle}>Limity hodin - {editLimitsUserName}</ThemedText>

              <ThemedText style={styles.settingsSectionTitle}>Denni limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsWorkDay}
                    onChangeText={setLimitsWorkDay}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsStudyDay}
                    onChangeText={setLimitsStudyDay}
                    keyboardType="numeric"
                    placeholder="4"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <ThemedText style={styles.settingsSectionTitle}>Tydenni limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsWorkWeek}
                    onChangeText={setLimitsWorkWeek}
                    keyboardType="numeric"
                    placeholder="40"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsStudyWeek}
                    onChangeText={setLimitsStudyWeek}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <ThemedText style={styles.settingsSectionTitle}>Mesicni limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsWorkMonth}
                    onChangeText={setLimitsWorkMonth}
                    keyboardType="numeric"
                    placeholder="160"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsStudyMonth}
                    onChangeText={setLimitsStudyMonth}
                    keyboardType="numeric"
                    placeholder="80"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <ThemedText style={styles.settingsSectionTitle}>Rocni limity</ThemedText>
              <View style={styles.settingsRow}>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Prace (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsWorkYear}
                    onChangeText={setLimitsWorkYear}
                    keyboardType="numeric"
                    placeholder="1920"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.settingsInputGroup}>
                  <ThemedText style={styles.settingsLabel}>Studium (h)</ThemedText>
                  <TextInput
                    style={[styles.settingsInput, { color: theme.text, borderColor: theme.border }]}
                    value={limitsStudyYear}
                    onChangeText={setLimitsStudyYear}
                    keyboardType="numeric"
                    placeholder="960"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditLimitsModal(false)}
                >
                  <ThemedText style={styles.buttonText}>Zrusit</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.saveButton, isSavingLimits && { opacity: 0.5 }]}
                  onPress={handleSaveLimits}
                  disabled={isSavingLimits}
                >
                  <ThemedText style={styles.buttonText}>
                    {isSavingLimits ? "Ukladam..." : "Ulozit"}
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={resetConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setResetConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Resetovat data</ThemedText>
            <ThemedText style={styles.modalText}>
              Opravdu chcete resetovat data uživatele {resetUserEmail}?
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setResetConfirmModal(false)}
              >
                <ThemedText style={styles.buttonText}>Zrušit</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.resetButton, isResetting && { opacity: 0.5 }]}
                onPress={confirmReset}
                disabled={isResetting}
              >
                <ThemedText style={styles.buttonText}>
                  {isResetting ? "Resetuji..." : "Resetovat"}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Smazat uživatele</ThemedText>
            <ThemedText style={styles.modalText}>
              Opravdu chcete smazat uživatele {deleteUserEmail}?
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteConfirmModal(false)}
              >
                <ThemedText style={styles.buttonText}>Zrušit</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.deleteButtonModal, isDeleting && { opacity: 0.5 }]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                <ThemedText style={styles.buttonText}>
                  {isDeleting ? "Mažu..." : "Smazat"}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={editCertModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditCertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Editovat odznak/certifikát</ThemedText>
            <TextInput
              style={[styles.credsInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Název"
              placeholderTextColor={theme.textSecondary}
              value={editCertTitle}
              onChangeText={setEditCertTitle}
            />
            <TextInput
              style={[styles.credsInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Body"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={editCertPoints}
              onChangeText={setEditCertPoints}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditCertModal(false)}
              >
                <ThemedText style={styles.buttonText}>Zrušit</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, isSavingCert && { opacity: 0.5 }]}
                onPress={handleSaveEditCert}
                disabled={isSavingCert}
              >
                <ThemedText style={styles.buttonText}>
                  {isSavingCert ? "Ukládám..." : "Uložit"}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={editCredsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditCredsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Editovat údaje</ThemedText>
            <TextInput
              style={[styles.credsInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Jméno"
              placeholderTextColor={theme.textSecondary}
              value={editCredsName}
              onChangeText={setEditCredsName}
              editable={!isSavingCreds}
            />
            <TextInput
              style={[styles.credsInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={editCredsEmail}
              onChangeText={setEditCredsEmail}
              editable={!isSavingCreds}
            />
            <TextInput
              style={[styles.credsInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Nové heslo (volitelně)"
              placeholderTextColor={theme.textSecondary}
              value={editCredsPassword}
              onChangeText={setEditCredsPassword}
              secureTextEntry
              editable={!isSavingCreds}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditCredsModal(false)}
              >
                <ThemedText style={styles.buttonText}>Zrušit</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, isSavingCreds && { opacity: 0.5 }]}
                onPress={confirmSaveCreds}
                disabled={isSavingCreds}
              >
                <ThemedText style={styles.buttonText}>
                  {isSavingCreds ? "Ukládám..." : "Uložit"}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: Spacing.lg,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  roleFilterContainer: {
    marginBottom: Spacing.lg,
  },
  roleFilterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginRight: Spacing.sm,
    borderWidth: 1,
  },
  userCard: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  userInfo: {
    marginBottom: Spacing.lg,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: Spacing.xs,
  },
  userPassword: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: Spacing.xs,
    fontFamily: "monospace",
  },
  userRole: {
    fontSize: 12,
    opacity: 0.7,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  resetButton: {
    backgroundColor: Colors.light.warning,
  },
  deleteButton: {
    backgroundColor: Colors.light.error,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  masterSelector: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  masterList: {
    flexDirection: "row",
  },
  masterButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  masterButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  masterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  masterButtonTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  apprenticeCard: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  apprenticeInfo: {
    flex: 1,
  },
  apprenticeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  apprenticeEmail: {
    fontSize: 12,
    opacity: 0.7,
  },
  removeButton: {
    backgroundColor: Colors.light.error,
    padding: Spacing.md,
    borderRadius: 8,
  },
  addApprenticeCard: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  certHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  formRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  ruleTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  condBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  certListLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  certItem: {
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  certMeta: {
    fontSize: 12,
  },
  rulesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  noRules: {
    fontSize: 13,
    marginVertical: Spacing.lg,
    textAlign: "center",
  },
  ruleItem: {
    padding: Spacing.lg,
    borderRadius: 8,
    marginBottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ruleType: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  ruleCondition: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 12,
    padding: Spacing.lg,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: Spacing.md,
  },
  modalText: {
    fontSize: 14,
    marginBottom: Spacing.lg,
    opacity: 0.8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.light.border,
  },
  deleteButtonModal: {
    backgroundColor: Colors.light.error,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
  },
  editButton: {
    backgroundColor: Colors.light.primary,
  },
  limitsButton: {
    backgroundColor: "#9B59B6",
  },
  credsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  settingsSection: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  settingsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  settingsInputGroup: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
    opacity: 0.8,
  },
  settingsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    textAlign: "center",
  },
  saveSettingsButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
