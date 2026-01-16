import React, { useState, useEffect } from "react";
import { View, TextInput, StyleSheet, Pressable, ScrollView, Platform, FlatList, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { ApprenticeHeaderTitle } from "@/components/ApprenticeHeaderTitle";

export default function LoginScreen({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, getAllUsers } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showUsers, setShowUsers] = useState(true);
  const [testSqlValue, setTestSqlValue] = useState("");
  const [savedTestValue, setSavedTestValue] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (err) {
        console.error("Chyba při načítání uživatelů:", err);
      }
    };

    const loadTestData = async () => {
      try {
        const data = await api.getTestValue("test_shared");
        setSavedTestValue(data.test_value || data.testValue || "Žádná data");
      } catch (err: any) {
        setSavedTestValue("⚠️ Backend není online: " + (err?.message || "Network error"));
      }
    };

    loadUsers();
    loadTestData();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Vyplňte všechna pole");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Přihlášení selhalo");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTestSql = async () => {
    setTestLoading(true);
    setTestStatus("💾 Ukládám do cloudu...");

    try {
      // Ulož do cloudu (PostgreSQL)
      await api.saveTestValue("test_shared", testSqlValue);
      setSavedTestValue(testSqlValue);
      setTestStatus(`✅ Uloženo v cloudu: "${testSqlValue}"`);
      setTimeout(() => setTestStatus(""), 3000);
    } catch (err) {
      setTestStatus("⚠️ Cloud server není dostupný");
      setTimeout(() => setTestStatus(""), 3000);
    } finally {
      setTestLoading(false);
    }
  };

  const handleLoadTestSql = async () => {
    setTestLoading(true);
    setTestStatus("📥 Načítám z cloudu...");

    try {
      // Načti z cloudu (PostgreSQL)
      const data = await api.getTestValue("test_shared");
      setSavedTestValue(data.testValue || "Žádné cloudové data");
      setTestStatus(data.testValue ? "✅ Načteno z cloudu" : "📭 Žádné cloudové data");
      setTimeout(() => setTestStatus(""), 3000);
    } catch (err) {
      setTestStatus("⚠️ Cloud server není dostupný");
      setTimeout(() => setTestStatus(""), 3000);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>Přihlášení</ThemedText>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: theme.text }]}>E-mail</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="jmeno@example.com"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: theme.text }]}>Heslo</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Vaše heslo"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {error ? (
          <ThemedText style={[styles.error, { color: theme.primary }]}>{error}</ThemedText>
        ) : null}

        <Pressable
          style={[styles.button, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>{loading ? "Přihlašování..." : "Přihlásit se"}</ThemedText>
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.dividerText, { color: theme.textSecondary }]}>nebo</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <Pressable style={[styles.button, { backgroundColor: theme.secondary }]} onPress={onSwitchToRegister}>
          <ThemedText style={styles.buttonText}>Nový účet</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: theme.textSecondary }]}
          onPress={() => setShowUsers(!showUsers)}
        >
          <ThemedText style={styles.buttonText}>{showUsers ? "Skrýt účty" : "Zobrazit dostupné účty"}</ThemedText>
        </Pressable>

        <View style={{ marginTop: Spacing.xl, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: theme.border }}>
          <ThemedText style={[styles.label, { color: theme.text }]}>📝 Supabase Test:</ThemedText>
          <ThemedText style={[{ color: theme.text, marginTop: Spacing.md, fontSize: 16, fontWeight: "bold" }]}>
            {savedTestValue}
          </ThemedText>
        </View>
      </View>

      {showUsers && users.length > 0 && (
        <View style={[styles.usersList, { borderTopColor: theme.border }]}>
          <ThemedText style={[styles.usersTitle, { color: theme.text }]}>Dostupní uživatelé - klikněte pro přihlášení:</ThemedText>
          {users.map((user, idx) => (
            <Pressable
              key={idx}
              style={[styles.userItem, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              onPress={() => {
                setEmail(user.email);
                setPassword(user.password);
              }}
            >
              <ThemedText style={[styles.userEmail, { color: theme.text }]}>{user.email}</ThemedText>
              <ThemedText style={[styles.userPassword, { color: theme.textSecondary }]}>Heslo: {user.password}</ThemedText>
              <ThemedText style={[styles.userName, { color: theme.textSecondary }]}>{user.name} ({user.role})</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing["3xl"],
    marginTop: Spacing["3xl"],
  },
  title: {
    ...Typography.display,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.body,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    minHeight: 48,
  },
  error: {
    ...Typography.body,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  button: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  buttonText: {
    ...Typography.body,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.small,
    marginHorizontal: Spacing.md,
  },
  usersList: {
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
  },
  usersTitle: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  userItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  userEmail: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  userPassword: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  userName: {
    ...Typography.small,
  },
});
