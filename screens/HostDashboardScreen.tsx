import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";
import { useNavigation } from "@react-navigation/native";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { getInitials } from "@/utils/string";

export default function HostDashboardScreen() {
    const insets = useScreenInsets();
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [apprentices, setApprentices] = useState<any[]>([]);
    const [masters, setMasters] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"apprentices" | "masters">("apprentices");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [users, connectionsData] = await Promise.all([
                api.getUsers(),
                api.getAllMasterApprenticeConnections()
            ]);

            const apprs = users.filter((u: any) => u.role === "Učedník")
                .sort((a, b) => a.name.localeCompare(b.name));
            const mstrs = users.filter((u: any) => u.role === "Mistr")
                .sort((a, b) => a.name.localeCompare(b.name));

            setApprentices(apprs);
            setMasters(mstrs);
            setConnections(connectionsData);
        } catch (error) {
            console.error("Chyba při načítání dat pro hosta:", error);
        } finally {
            setLoading(false);
        }
    };

    const getConnectedInitials = (user: any) => {
        if (user.role === "Učedník") {
            const myConnections = connections.filter((c: any) => c.apprentice_id === user.id);
            if (myConnections.length === 0) return "BEZ MISTRA";

            const initials = myConnections.map((c: any) => {
                const master = masters.find(m => m.id === c.master_id);
                return master ? getInitials(master.name) : "?";
            }).filter((i: string) => i !== "?");

            return initials.length > 0 ? initials.join(", ") : "Neznámý mistr";
        } else {
            const myConnections = connections.filter((c: any) => c.master_id === user.id);
            if (myConnections.length === 0) return "BEZ UČEDNÍKA";

            const initials = myConnections.map((c: any) => {
                const apprentice = apprentices.find(a => a.id === c.apprentice_id);
                return apprentice ? getInitials(apprentice.name) : (c.apprentice_name ? getInitials(c.apprentice_name) : "?");
            });
            return initials.join(", ");
        }
    };

    const renderUserItem = ({ item }: { item: any }) => (
        <Pressable
            style={({ pressed }) => [
                styles.userCard,
                {
                    backgroundColor: theme.backgroundSecondary,
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: 1,
                    borderColor: theme.border,
                    shadowOpacity: pressed ? 0.1 : 0,
                    elevation: pressed ? 2 : 0
                }
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
                <ThemedText style={[styles.userEmail, { color: theme.textSecondary }]}>
                    {getConnectedInitials(item)}
                </ThemedText>
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
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.paddingBottom + 20 }
                ]}
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
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0,
        shadowRadius: 4,
        elevation: 0,
    },
    userIcon: {
        width: 48,
        height: 48,
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
