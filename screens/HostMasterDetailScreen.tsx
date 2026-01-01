import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";
import { useNavigation } from "@react-navigation/native";

export default function HostMasterDetailScreen({ route }: any) {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();
    const { masterId, masterName } = route.params;

    const [loading, setLoading] = useState(true);
    const [apprentices, setApprentices] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [masterId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const connections = await api.getApprentices(masterId);
            setApprentices(connections);
        } catch (error) {
            console.error("Chyba při načítání detailu mistra:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderApprenticeItem = ({ item }: { item: any }) => (
        <Pressable
            style={({ pressed }) => [
                styles.userCard,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => {
                navigation.navigate("HostApprenticeDetail", {
                    apprenticeId: item.apprentice_id,
                    apprenticeName: item.apprentice_name
                });
            }}
        >
            <View style={styles.userIcon}>
                <Feather name="user" size={24} color={theme.primary} />
            </View>
            <View style={styles.userInfo}>
                <ThemedText style={styles.userName}>{item.apprentice_name}</ThemedText>
                <ThemedText style={[styles.userRole, { color: theme.textSecondary }]}>Učedník v zácviku</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
            <ScreenKeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>

                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Feather name="shield" size={44} color={theme.primary} />
                    </View>
                    <ThemedText style={styles.name}>{masterName}</ThemedText>
                    <ThemedText style={[styles.role, { color: theme.textSecondary }]}>Mistr Svobodných cechů</ThemedText>
                </View>

                {/* Apprentices List */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Jeho Učedníci ({apprentices.length})</ThemedText>
                    {apprentices.length > 0 ? (
                        apprentices.map((item, index) => (
                            <View key={index}>{renderApprenticeItem({ item })}</View>
                        ))
                    ) : (
                        <ThemedView style={styles.emptyCard}>
                            <Feather name="users" size={32} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Tento mistr zatím nemá žádné učedníky</ThemedText>
                        </ThemedView>
                    )}
                </View>

            </ScreenKeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        alignItems: "center",
        padding: Spacing.xl,
        paddingTop: Spacing["2xl"],
        marginBottom: Spacing.lg,
    },
    avatarContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.md,
    },
    name: {
        fontSize: 28,
        fontWeight: "800",
    },
    role: {
        fontSize: 17,
        marginTop: 4,
    },
    section: {
        paddingHorizontal: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: Spacing.lg,
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    userIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: Spacing.md,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 17,
        fontWeight: "700",
    },
    userRole: {
        fontSize: 13,
        marginTop: 2,
    },
    emptyCard: {
        padding: Spacing["2xl"],
        alignItems: "center",
        borderRadius: BorderRadius.lg,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        textAlign: "center",
    },
});
