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
  const [newCertScope, setNewCertScope] = useState<"GLOBAL" | "PER_MASTER">("GLOBAL");
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
  const [reqWorkHours, setReqWorkHours] = useState("");
  const [reqStudyHours, setReqStudyHours] = useState("");
  const [reqProjects, setReqProjects] = useState("");
  const [reqPoints, setReqPoints] = useState("");
  const [reqTotalHours, setReqTotalHours] = useState("");
  const [editReqTotalHours, setEditReqTotalHours] = useState("");

  const [useReqWorkHours, setUseReqWorkHours] = useState(false);
  const [useReqStudyHours, setUseReqStudyHours] = useState(false);
  const [useReqProjects, setUseReqProjects] = useState(false);
  const [useReqTotalHours, setUseReqTotalHours] = useState(false);

  const [editUseReqWorkHours, setEditUseReqWorkHours] = useState(false);
  const [editUseReqStudyHours, setEditUseReqStudyHours] = useState(false);
  const [editUseReqProjects, setEditUseReqProjects] = useState(false);
  const [editUseReqTotalHours, setEditUseReqTotalHours] = useState(false);
  const [newCertRuleLogic, setNewCertRuleLogic] = useState<"AND" | "OR">("AND");
  const [editCertType, setEditCertType] = useState("BADGE");
  const [editCertScope, setEditCertScope] = useState("GLOBAL");
  const [editCertRuleLogic, setEditCertRuleLogic] = useState<"AND" | "OR">("AND");
  const [editReqWorkHours, setEditReqWorkHours] = useState("");
  const [editReqStudyHours, setEditReqStudyHours] = useState("");
  const [editReqProjects, setEditReqProjects] = useState("");
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
  const [showDeleteCertConfirm, setShowDeleteCertConfirm] = useState(false);
  const [certToDelete, setCertToDelete] = useState<number | null>(null);
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

  const formatRuleFormula = (item: any) => {
    const rules = item.certificate_rules || [];
    const logic = item.rule_logic || "AND";
    if (!rules || rules.length === 0) return "";

    // Filtrovat pouze automatická pravidla
    const autoRules = rules.filter((r: any) => r.rule_type !== 'MANUAL');
    if (autoRules.length === 0) return "";

    const typeMap: Record<string, string> = {
      "WORK_HOURS": "P",
      "STUDY_HOURS": "S",
      "TOTAL_HOURS": "PS",
      "PROJECTS": "PJ"
    };

    const parts = autoRules.map((r: any) => {
      const sym = typeMap[r.condition_type];
      if (!sym) return null;
      return `${r.condition_value}${sym}`;
    }).filter((p: any) => p !== null);

    if (parts.length === 0) return "";

    const separator = logic === "OR" ? " / " : " + ";
    return parts.join(separator);
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

    // Check for duplicates
    const exists = certificates.some(c => c.title?.trim().toLowerCase() === newCertTitle.trim().toLowerCase());
    if (exists) {
      Alert.alert("Chyba", "Certifikát s tímto názvem již existuje.");
      return;
    }
    try {
      const template = await api.addCertificateTemplate(
        newCertTitle,
        newCertCategory === "Badge" ? "BADGE" : "CERTIFICATE",
        newCertCategory === "Badge" ? newCertScope : "PER_MASTER",
        parseInt(newCertPoints) || 0,
        "",
        newCertRuleLogic
      );

      if (template && template.id) {
        if (newCertCategory === "Badge") {
          if (useReqWorkHours) {
            await api.addCertificateUnlockRule(template.id, "AUTO", "WORK_HOURS", parseFloat(reqWorkHours) || 0, `Práce: ${reqWorkHours}h`);
          }
          if (useReqStudyHours) {
            await api.addCertificateUnlockRule(template.id, "AUTO", "STUDY_HOURS", parseFloat(reqStudyHours) || 0, `Studium: ${reqStudyHours}h`);
          }
          if (useReqProjects) {
            await api.addCertificateUnlockRule(template.id, "AUTO", "PROJECTS", parseInt(reqProjects) || 0, `Projekty: ${reqProjects}`);
          }
          if (useReqTotalHours) {
            await api.addCertificateUnlockRule(template.id, "AUTO", "TOTAL_HOURS", parseFloat(reqTotalHours) || 0, `Celkem hodin: ${reqTotalHours}h`);
          }
        } else {
          // Add manual rule for Certificates
          await api.addCertificateUnlockRule(template.id, "MANUAL", null as any, 0, "Aktivace mistrem");
        }
      }

      setNewCertTitle("");
      setNewCertPoints("0");
      setReqWorkHours("");
      setReqStudyHours("");
      setReqProjects("");
      setReqTotalHours("");
      setReqPoints("");
      setUseReqWorkHours(false);
      setUseReqStudyHours(false);
      setUseReqProjects(false);
      setUseReqTotalHours(false);

      setShowAddCertForm(false);
      await loadCertificates();
    } catch (error) {
      console.error(error);
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

  const handleEditCert = async (certId: number, title: string, points: number) => {
    setEditCertId(certId);
    setEditCertTitle(title);
    setEditCertPoints(String(points));

    const cert = certificates.find((c: any) => c.id === certId);
    if (cert) {
      setEditCertType(cert.item_type || (cert.category === 'Badge' ? 'BADGE' : 'CERTIFICATE'));
      setEditCertScope(cert.scope || 'GLOBAL');
      setEditCertRuleLogic(cert.rule_logic || "AND");
    }

    try {
      const rules = await api.getCertificateUnlockRules(certId);
      const rWork = rules.find((r: any) => r.condition_type === 'WORK_HOURS');
      const rStudy = rules.find((r: any) => r.condition_type === 'STUDY_HOURS');
      const rProj = rules.find((r: any) => r.condition_type === 'PROJECTS');
      const rTotal = rules.find((r: any) => r.condition_type === 'TOTAL_HOURS');

      setEditReqWorkHours(rWork ? String(rWork.condition_value) : "0");
      setEditReqStudyHours(rStudy ? String(rStudy.condition_value) : "0");
      setEditReqProjects(rProj ? String(rProj.condition_value) : "0");
      setEditReqTotalHours(rTotal ? String(rTotal.condition_value) : "0");

      setEditUseReqWorkHours(!!rWork);
      setEditUseReqStudyHours(!!rStudy);
      setEditUseReqProjects(!!rProj);
      setEditUseReqTotalHours(!!rTotal);
    } catch (e) {
      console.error(e);
    }

    setEditCertModal(true);
  };

  const handleSaveEditCert = async () => {
    if (!editCertId || !editCertTitle.trim()) return;
    setIsSavingCert(true);
    try {
      await api.updateCertificateTemplate(
        editCertId,
        editCertTitle,
        parseInt(editCertPoints) || 0,
        editCertType,
        editCertScope,
        editCertRuleLogic
      );

      // Replace Rules
      const rules = await api.getCertificateUnlockRules(editCertId);
      for (const r of rules) {
        await api.deleteCertificateUnlockRule(r.id);
      }

      if (editCertType === "BADGE") {
        if (editUseReqWorkHours) await api.addCertificateUnlockRule(editCertId, "AUTO", "WORK_HOURS", parseFloat(editReqWorkHours) || 0, `Práce: ${editReqWorkHours}h`);
        if (editUseReqStudyHours) await api.addCertificateUnlockRule(editCertId, "AUTO", "STUDY_HOURS", parseFloat(editReqStudyHours) || 0, `Studium: ${editReqStudyHours}h`);
        if (editUseReqProjects) await api.addCertificateUnlockRule(editCertId, "AUTO", "PROJECTS", parseInt(editReqProjects) || 0, `Projekty: ${editReqProjects}`);
        if (editUseReqTotalHours) await api.addCertificateUnlockRule(editCertId, "AUTO", "TOTAL_HOURS", parseFloat(editReqTotalHours) || 0, `Celkem hodin: ${editReqTotalHours}h`);
      } else {
        await api.addCertificateUnlockRule(editCertId, "MANUAL", null as any, 0, "Aktivace mistrem");
      }

      setEditCertModal(false);
      await loadCertificates();
    } catch (error: any) {
      Alert.alert("Chyba", "Nepodařilo se aktualizovat certifikát");
    } finally {
      setIsSavingCert(false);
    }
  };

  const handleDeleteCert = (certId: number) => {
    setCertToDelete(certId);
    setShowDeleteCertConfirm(true);
  };

  const executeDeleteCert = async () => {
    if (!certToDelete) return;
    try {
      await api.deleteCertificateTemplate(certToDelete);
      console.log("✅ Certifikát smazán, reloaduji...");
      await loadCertificates();
      setSelectedCertId(null);
      setRules([]);
    } catch (error: any) {
      console.error("❌ Chyba při mazání certifikátu:", error);
      Alert.alert("Chyba", "Nepodařilo se smazat certifikát");
    } finally {
      setShowDeleteCertConfirm(false);
      setCertToDelete(null);
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

            </View>



            {certLoading ? (
              <ThemedText>Načítání...</ThemedText>
            ) : (
              <>
                {/* --- ODZNAKY SECTION --- */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>Odznaky</ThemedText>
                  <Pressable
                    style={[styles.addButton, { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }]}
                    onPress={() => { setNewCertCategory("Badge"); setShowAddCertForm(true); }}
                  >
                    <Feather name="plus" size={18} color="#fff" />
                  </Pressable>
                </View>

                {/* 1. GLOBÁLNÍ ODZNAKY */}
                {certificates.filter((c: any) => (c.item_type === 'BADGE' || (!c.item_type && c.category === 'Badge')) && (c.scope === 'GLOBAL' || !c.scope)).length > 0 && (
                  <>
                    <ThemedText style={[styles.certListLabel, { color: theme.textSecondary, fontSize: 13 }]}>Globální Odznaky (Ze všech aktivit):</ThemedText>
                    <FlatList
                      data={certificates.filter((c: any) => (c.item_type === 'BADGE' || (!c.item_type && c.category === 'Badge')) && (c.scope === 'GLOBAL' || !c.scope))}
                      renderItem={({ item }) => (
                        <View style={[styles.certItem, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, selectedCertId === item.id ? { borderColor: theme.primary, borderWidth: 3, backgroundColor: theme.primary + "15" } : { borderColor: theme.border }]}>
                          <Pressable style={{ flex: 1 }} onPress={() => { setSelectedCertId(item.id); loadRules(item.id); }}>
                            <ThemedText style={[styles.certTitle, selectedCertId === item.id && { fontWeight: "bold", color: theme.primary }]}>{item.title}</ThemedText>
                            <ThemedText style={[styles.certMeta, { color: theme.textSecondary }]}>{item.points} bodů</ThemedText>
                            <ThemedText style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', marginTop: 2 }}>{formatRuleFormula(item)}</ThemedText>
                          </Pressable>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable onPress={() => handleEditCert(item.id, item.title, item.points)}><Feather name="edit-2" size={16} color={theme.primary} /></Pressable>
                            <Pressable onPress={() => handleDeleteCert(item.id)}><Feather name="trash-2" size={16} color={theme.error} /></Pressable>
                          </View>
                        </View>
                      )}
                      keyExtractor={(item) => String(item.id)}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                    />
                  </>
                )}

                {/* 2. MISTROVSKÉ ODZNAKY */}
                {certificates.filter((c: any) => (c.item_type === 'BADGE' || (!c.item_type && c.category === 'Badge')) && c.scope === 'PER_MASTER').length > 0 && (
                  <>
                    <ThemedText style={[styles.certListLabel, { marginTop: Spacing.lg, color: theme.textSecondary, fontSize: 13 }]}>Mistrovské Odznaky (Pro každého mistra):</ThemedText>
                    <FlatList
                      data={certificates.filter((c: any) => (c.item_type === 'BADGE' || (!c.item_type && c.category === 'Badge')) && c.scope === 'PER_MASTER')}
                      renderItem={({ item }) => (
                        <View style={[styles.certItem, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, selectedCertId === item.id ? { borderColor: theme.primary, borderWidth: 3, backgroundColor: theme.primary + "15" } : { borderColor: theme.border }]}>
                          <Pressable style={{ flex: 1 }} onPress={() => { setSelectedCertId(item.id); loadRules(item.id); }}>
                            <ThemedText style={[styles.certTitle, selectedCertId === item.id && { fontWeight: "bold", color: theme.primary }]}>{item.title}</ThemedText>
                            <ThemedText style={[styles.certMeta, { color: theme.textSecondary }]}>{item.points} bodů</ThemedText>
                            <ThemedText style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', marginTop: 2 }}>{formatRuleFormula(item)}</ThemedText>
                          </Pressable>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable onPress={() => handleEditCert(item.id, item.title, item.points)}><Feather name="edit-2" size={16} color={theme.primary} /></Pressable>
                            <Pressable onPress={() => handleDeleteCert(item.id)}><Feather name="trash-2" size={16} color={theme.error} /></Pressable>
                          </View>
                        </View>
                      )}
                      keyExtractor={(item) => String(item.id)}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                    />
                  </>
                )}

                {/* Empty Badges State */}
                {certificates.filter((c: any) => c.item_type === 'BADGE' || (!c.item_type && c.category === 'Badge')).length === 0 && (
                  <ThemedText style={{ opacity: 0.5, fontStyle: 'italic', marginBottom: Spacing.md, marginTop: Spacing.sm }}>Žádné odznaky.</ThemedText>
                )}

                {/* --- CERTIFIKÁTY SECTION --- */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>Certifikáty</ThemedText>
                  <Pressable
                    style={[styles.addButton, { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }]}
                    onPress={() => { setNewCertCategory("Certifikát"); setShowAddCertForm(true); }}
                  >
                    <Feather name="plus" size={18} color="#fff" />
                  </Pressable>
                </View>

                {/* 3. CERTIFIKÁTY */}
                {certificates.filter((c: any) => c.item_type === 'CERTIFICATE' || (!c.item_type && c.category === 'Certifikát')).length > 0 ? (
                  <>
                    <ThemedText style={[styles.certListLabel, { marginTop: Spacing.sm, color: theme.textSecondary, fontSize: 13 }]}>Certifikáty (Aktivuje Mistr):</ThemedText>
                    <FlatList
                      data={certificates.filter((c: any) => c.item_type === 'CERTIFICATE' || (!c.item_type && c.category === 'Certifikát'))}
                      renderItem={({ item }) => (
                        <View style={[styles.certItem, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, selectedCertId === item.id ? { borderColor: theme.primary, borderWidth: 3, backgroundColor: theme.primary + "15" } : { borderColor: theme.border }]}>
                          <Pressable style={{ flex: 1 }} onPress={() => { setSelectedCertId(item.id); loadRules(item.id); }}>
                            <ThemedText style={[styles.certTitle, selectedCertId === item.id && { fontWeight: "bold", color: theme.primary }]}>{item.title}</ThemedText>
                            <ThemedText style={[styles.certMeta, { color: theme.textSecondary }]}>{item.points} bodů</ThemedText>
                            <ThemedText style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', marginTop: 2 }}>{formatRuleFormula(item)}</ThemedText>
                          </Pressable>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable onPress={() => handleEditCert(item.id, item.title, item.points)}><Feather name="edit-2" size={16} color={theme.primary} /></Pressable>
                            <Pressable onPress={() => handleDeleteCert(item.id)}><Feather name="trash-2" size={16} color={theme.error} /></Pressable>
                          </View>
                        </View>
                      )}
                      keyExtractor={(item) => String(item.id)}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                    />
                  </>
                ) : (
                  <ThemedText style={{ opacity: 0.5, fontStyle: 'italic', marginTop: Spacing.sm }}>Žádné certifikáty.</ThemedText>
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
        visible={showDeleteCertConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteCertConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Smazat certifikát/odznak?</ThemedText>
            <ThemedText style={{ marginBottom: 20, color: theme.text }}>
              Opravdu chcete smazat tuto položku? Tato akce je nevratná.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteCertConfirm(false)}
              >
                <ThemedText style={styles.buttonText}>Zrušit</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.deleteButtonModal]}
                onPress={executeDeleteCert}
              >
                <ThemedText style={styles.buttonText}>Smazat</ThemedText>
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
        visible={showAddCertForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCertForm(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { maxHeight: '90%' }]}>
            <ThemedText style={styles.modalTitle}>
              {newCertCategory === 'Badge' ? 'Nový Odznak' : 'Nový Certifikát'}
            </ThemedText>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.credsInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Název"
                placeholderTextColor={theme.textSecondary}
                value={newCertTitle}
                onChangeText={setNewCertTitle}
              />

              {newCertCategory === "Badge" && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <Pressable
                    style={[styles.categoryBtn, newCertScope === "GLOBAL" && { backgroundColor: theme.primary }]}
                    onPress={() => setNewCertScope("GLOBAL")}>
                    <ThemedText style={{ color: newCertScope === "GLOBAL" ? "#fff" : theme.text, fontSize: 12 }}>Globální</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.categoryBtn, newCertScope === "PER_MASTER" && { backgroundColor: theme.primary }]}
                    onPress={() => setNewCertScope("PER_MASTER")}>
                    <ThemedText style={{ color: newCertScope === "PER_MASTER" ? "#fff" : theme.text, fontSize: 12 }}>U mistra</ThemedText>
                  </Pressable>
                </View>
              )}

              <TextInput
                style={[styles.credsInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Body"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={newCertPoints}
                onChangeText={setNewCertPoints}
              />

              {newCertCategory === "Badge" && (
                <View style={{ marginTop: Spacing.sm }}>
                  <ThemedText style={{ fontWeight: '600', marginBottom: 8 }}>Podmínky pro získání:</ThemedText>

                  <View style={{ flexDirection: 'row', marginBottom: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 8, overflow: 'hidden' }}>
                    <Pressable style={{ flex: 1, padding: 8, backgroundColor: newCertRuleLogic === 'AND' ? theme.primary : 'transparent', alignItems: 'center' }} onPress={() => setNewCertRuleLogic('AND')}>
                      <ThemedText style={{ color: newCertRuleLogic === 'AND' ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>Všechny (AND)</ThemedText>
                    </Pressable>
                    <View style={{ width: 1, backgroundColor: theme.border }} />
                    <Pressable style={{ flex: 1, padding: 8, backgroundColor: newCertRuleLogic === 'OR' ? theme.primary : 'transparent', alignItems: 'center' }} onPress={() => setNewCertRuleLogic('OR')}>
                      <ThemedText style={{ color: newCertRuleLogic === 'OR' ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>Alespoň 1 (OR)</ThemedText>
                    </Pressable>
                  </View>

                  {/* Work Hours */}
                  <View style={{ marginBottom: 8 }}>
                    <Pressable onPress={() => setUseReqWorkHours(!useReqWorkHours)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Feather name={useReqWorkHours ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                      <ThemedText style={{ fontWeight: '600' }}>Pracovní hodiny</ThemedText>
                    </Pressable>
                    {useReqWorkHours && (
                      <TextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                        keyboardType="numeric"
                        value={reqWorkHours}
                        onChangeText={setReqWorkHours}
                        placeholder="Počet"
                        placeholderTextColor={theme.textSecondary}
                      />
                    )}
                  </View>

                  {/* Study Hours */}
                  <View style={{ marginBottom: 8 }}>
                    <Pressable onPress={() => setUseReqStudyHours(!useReqStudyHours)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Feather name={useReqStudyHours ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                      <ThemedText style={{ fontWeight: '600' }}>Studijní hodiny</ThemedText>
                    </Pressable>
                    {useReqStudyHours && (
                      <TextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                        keyboardType="numeric"
                        value={reqStudyHours}
                        onChangeText={setReqStudyHours}
                        placeholder="Počet"
                        placeholderTextColor={theme.textSecondary}
                      />
                    )}
                  </View>

                  {/* Projects */}
                  <View style={{ marginBottom: 8 }}>
                    <Pressable onPress={() => setUseReqProjects(!useReqProjects)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Feather name={useReqProjects ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                      <ThemedText style={{ fontWeight: '600' }}>Počet projektů</ThemedText>
                    </Pressable>
                    {useReqProjects && (
                      <TextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                        keyboardType="numeric"
                        value={reqProjects}
                        onChangeText={setReqProjects}
                        placeholder="Počet"
                        placeholderTextColor={theme.textSecondary}
                      />
                    )}
                  </View>

                  {/* Total Hours */}
                  <View style={{ marginBottom: 8 }}>
                    <Pressable onPress={() => setUseReqTotalHours(!useReqTotalHours)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Feather name={useReqTotalHours ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                      <ThemedText style={{ fontWeight: '600' }}>Součet Práce+Studium</ThemedText>
                    </Pressable>
                    {useReqTotalHours && (
                      <TextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                        keyboardType="numeric"
                        value={reqTotalHours}
                        onChangeText={setReqTotalHours}
                        placeholder="Počet"
                        placeholderTextColor={theme.textSecondary}
                      />
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowAddCertForm(false)}>
                <ThemedText style={styles.buttonText}>Zrušit</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleAddCertificate}>
                <ThemedText style={styles.buttonText}>Přidat</ThemedText>
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


            {editCertType === "BADGE" && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <Pressable style={[styles.categoryBtn, editCertScope === "GLOBAL" && { backgroundColor: theme.primary }]} onPress={() => setEditCertScope("GLOBAL")}>
                  <ThemedText style={{ color: editCertScope === "GLOBAL" ? "#fff" : theme.text, fontSize: 12 }}>Globální</ThemedText>
                </Pressable>
                <Pressable style={[styles.categoryBtn, editCertScope === "PER_MASTER" && { backgroundColor: theme.primary }]} onPress={() => setEditCertScope("PER_MASTER")}>
                  <ThemedText style={{ color: editCertScope === "PER_MASTER" ? "#fff" : theme.text, fontSize: 12 }}>U mistra</ThemedText>
                </Pressable>
              </View>
            )}

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

            {editCertType === "BADGE" && (
              <View style={{ marginTop: Spacing.sm, marginBottom: Spacing.md }}>
                <ThemedText style={{ fontWeight: '600', marginBottom: 8 }}>Podmínky pro získání:</ThemedText>

                <View style={{ flexDirection: 'row', marginBottom: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 8, overflow: 'hidden' }}>
                  <Pressable style={{ flex: 1, padding: 8, backgroundColor: editCertRuleLogic === 'AND' ? theme.primary : 'transparent', alignItems: 'center' }} onPress={() => setEditCertRuleLogic('AND')}>
                    <ThemedText style={{ color: editCertRuleLogic === 'AND' ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>Všechny (AND)</ThemedText>
                  </Pressable>
                  <View style={{ width: 1, backgroundColor: theme.border }} />
                  <Pressable style={{ flex: 1, padding: 8, backgroundColor: editCertRuleLogic === 'OR' ? theme.primary : 'transparent', alignItems: 'center' }} onPress={() => setEditCertRuleLogic('OR')}>
                    <ThemedText style={{ color: editCertRuleLogic === 'OR' ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>Alespoň 1 (OR)</ThemedText>
                  </Pressable>
                </View>

                {/* Work Hours */}
                <View style={{ marginBottom: 8 }}>
                  <Pressable onPress={() => setEditUseReqWorkHours(!editUseReqWorkHours)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Feather name={editUseReqWorkHours ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontWeight: '600' }}>Pracovní hodiny</ThemedText>
                  </Pressable>
                  {editUseReqWorkHours && (
                    <TextInput
                      style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                      keyboardType="numeric"
                      value={editReqWorkHours}
                      onChangeText={setEditReqWorkHours}
                      placeholder="Počet"
                      placeholderTextColor={theme.textSecondary}
                    />
                  )}
                </View>

                {/* Study Hours */}
                <View style={{ marginBottom: 8 }}>
                  <Pressable onPress={() => setEditUseReqStudyHours(!editUseReqStudyHours)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Feather name={editUseReqStudyHours ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontWeight: '600' }}>Studijní hodiny</ThemedText>
                  </Pressable>
                  {editUseReqStudyHours && (
                    <TextInput
                      style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                      keyboardType="numeric"
                      value={editReqStudyHours}
                      onChangeText={setEditReqStudyHours}
                      placeholder="Počet"
                      placeholderTextColor={theme.textSecondary}
                    />
                  )}
                </View>

                {/* Projects */}
                <View style={{ marginBottom: 8 }}>
                  <Pressable onPress={() => setEditUseReqProjects(!editUseReqProjects)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Feather name={editUseReqProjects ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontWeight: '600' }}>Počet projektů</ThemedText>
                  </Pressable>
                  {editUseReqProjects && (
                    <TextInput
                      style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                      keyboardType="numeric"
                      value={editReqProjects}
                      onChangeText={setEditReqProjects}
                      placeholder="Počet"
                      placeholderTextColor={theme.textSecondary}
                    />
                  )}
                </View>

                {/* Total Hours */}
                <View style={{ marginBottom: 8 }}>
                  <Pressable onPress={() => setEditUseReqTotalHours(!editUseReqTotalHours)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Feather name={editUseReqTotalHours ? "check-square" : "square"} size={20} color={theme.text} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontWeight: '600' }}>Součet Práce+Studium</ThemedText>
                  </Pressable>
                  {editUseReqTotalHours && (
                    <TextInput
                      style={[styles.input, { borderColor: theme.border, color: theme.text, marginLeft: 28, marginBottom: 0 }]}
                      keyboardType="numeric"
                      value={editReqTotalHours}
                      onChangeText={setEditReqTotalHours}
                      placeholder="Počet"
                      placeholderTextColor={theme.textSecondary}
                    />
                  )}
                </View>
              </View>
            )}
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
