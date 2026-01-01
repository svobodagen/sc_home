import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, ScrollView, Animated } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";
import { useNavigation } from "@react-navigation/native";

export default function HostDashboardScreen() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const navigation = useNavigation<any>();

    const [apprentices, setApprentices] = useState<any[]>([]);
    const [masters, setMasters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"apprentices" | "masters">("apprentices");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const allUsers = await api.getUsers();

            const apprs = allUsers.filter((u: any) => u.role === "Učedník")
                .sort((a, b) => a.name.localeCompare(b.name));
            const mstrs = allUsers.filter((u: any) => u.role === "Mistr")
                .sort((a, b) => a.name.localeCompare(b.name));

            setApprentices(apprs);
            setMasters(mstrs);
        } catch (error) {
            console.error("Chyba při načítání dat pro hosta:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderUserItem = ({ item }: { item: any }) => (
        <Pressable
            style={({ pressed }) => [
                styles.userCard,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => {
                if (item.role === "Učedník") {
                    navigation.navigate("HostApprenticeDetail", {
                        apprenticeId: item.id,
                        apprenticeName: item.name
                    });
                } else {
                    navigation.navigate("HostMasterDetail", {
                        masterId: item.id,
                        masterName: item.name
                    });
                }
            }}
        >
            <View style={styles.userIcon}>
                <Feather name={item.role === "Mistr" ? "shield" : "user"} size={24} color={theme.primary} />
            </View>
            <View style={styles.userInfo}>
                <ThemedText style={styles.userName}>{item.name}</ThemedText>
                <ThemedText style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>

            <View style={styles.tabContainer}>
                <Pressable
                    onPress={() => setActiveTab("apprentices")}
                    style={[styles.tab, activeTab === "apprentices" && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
                >
                    <ThemedText style={[styles.tabText, activeTab === "apprentices" && { color: theme.primary, fontWeight: "700" }]}>
                        Učedníci ({apprentices.length})
                    </ThemedText>
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab("masters")}
                    style={[styles.tab, activeTab === "masters" && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
                >
                    <ThemedText style={[styles.tabText, activeTab === "masters" && { color: theme.primary, fontWeight: "700" }]}>
                        Mistři ({masters.length})
                    </ThemedText>
                </Pressable>
            </View>

            <FlatList
                data={activeTab === "apprentices" ? apprentices : masters}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={loadData}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="users" size={48} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                            {loading ? "Načítám..." : "Žádní uživatelé nenalezeni"}
                        </ThemedText>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(156, 163, 175, 0.2)",
        marginBottom: Spacing.md,
        paddingTop: Spacing.xl,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: "center",
    },
    tabText: {
        fontSize: 15,
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md + 8,
        paddingBottom: 100, // Space for tab bar
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(220, 38, 38, 0.1)", // Primary with alpha
        alignItems: "center",
        justifyContent: "center",
        marginRight: Spacing.md,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: "700",
    },
    userEmail: {
        fontSize: 14,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    },
});
