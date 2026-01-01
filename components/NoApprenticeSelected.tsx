import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export function NoApprenticeSelected() {
    const { theme } = useTheme();
    const navigation = useNavigation();

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedView style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
                    <Feather name="users" size={48} color={theme.primary} />
                </View>

                <ThemedText style={[styles.title, { color: theme.text }]}>
                    Není vybrán žádný učedník
                </ThemedText>

                <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
                    Pro zobrazení detailů a statistik musíte nejprve vybrat učedníka ze seznamu.
                </ThemedText>

                <Pressable
                    style={[styles.button, { backgroundColor: theme.primary }]}
                    onPress={() => navigation.navigate("Masters" as never)}
                >
                    <ThemedText style={styles.buttonText}>Vybrat učedníka</ThemedText>
                    <Feather name="arrow-right" size={20} color="#FFFFFF" />
                </Pressable>
            </ThemedView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.lg,
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
        padding: Spacing.xl,
        borderRadius: BorderRadius.lg,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: Spacing.md,
    },
    description: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: Spacing.xl,
        lineHeight: 24,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.sm,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
