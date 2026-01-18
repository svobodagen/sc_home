import React, { useState } from "react";
import { View, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApprenticeHeaderTitle } from "@/components/ApprenticeHeaderTitle";

export default function RegisterScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("Učedník");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roles: UserRole[] = ["Host", "Učedník", "Mistr", "Admin"];

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setError("Vyplňte všechna pole");
      return;
    }

    if (password.length < 4) {
      setError("Heslo musí mít alespoň 4 znaky");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await register(email, password, name, selectedRole);
    } catch (err: any) {
      setError(err.message || "Registrace selhala");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl + 20, // Extra padding at bottom
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>Nový účet</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.text }]}>Jméno</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Vaše jméno"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

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
              placeholder="Minimálně 4 znaky"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.text }]}>Vaše role</ThemedText>
            <View style={styles.roleContainer}>
              {roles.map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setSelectedRole(role)}
                  disabled={loading}
                  style={[
                    styles.roleButton,
                    {
                      backgroundColor: selectedRole === role ? theme.primary : theme.backgroundDefault,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.roleButtonText,
                      {
                        color: selectedRole === role ? "#FFFFFF" : theme.text,
                        fontWeight: selectedRole === role ? "700" : "600",
                      },
                    ]}
                  >
                    {role}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Explicit spacer to force layout separation */}
          <View style={{ height: 40, width: '100%' }} />

          {error ? (
            <ThemedText style={[styles.error, { color: theme.primary }]}>{error}</ThemedText>
          ) : null}

          <Pressable
            style={[styles.button, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <ThemedText style={styles.buttonText}>{loading ? "Registrace..." : "Vytvořit účet"}</ThemedText>
          </Pressable>

          <Pressable onPress={onSwitchToLogin}>
            <ThemedText style={[styles.switchText, { color: theme.primary }]}>Již mám účet</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView >
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
  roleContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  roleButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  roleButtonText: {
    ...Typography.small,
    fontSize: 13,
  },
  error: {
    ...Typography.body,
    fontWeight: "600",
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
  switchText: {
    ...Typography.body,
    fontWeight: "600",
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
