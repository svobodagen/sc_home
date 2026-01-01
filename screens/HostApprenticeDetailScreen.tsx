import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, ScrollView, Image } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius, Typography, Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";
import { useNavigation } from "@react-navigation/native";

export default function HostApprenticeDetailScreen({ route }: any) {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();
    const { apprenticeId, apprenticeName } = route.params;

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [workHours, setWorkHours] = useState<any[]>([]);
    const [masters, setMasters] = useState<any[]>([]);
    const [apprenticeInfo, setApprenticeInfo] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [apprenticeId]);

    const loadData = async () => {
        try {
            setLoading(true);

            const [allUsers, projs, certs, hours, mstrConns] = await Promise.all([
                api.getUsers(),
                api.getProjects(apprenticeId),
                api.getCertificates(apprenticeId),
                api.getWorkHours(apprenticeId),
                api.getMastersForApprentice(apprenticeId)
            ]);

            const info = allUsers.find((u: any) => u.id === apprenticeId);
            setApprenticeInfo(info);
            setProjects(projs);
            setCertificates(certs);
            setWorkHours(hours);

            if (mstrConns && mstrConns.length > 0) {
                const results = mstrConns.map((conn: any) => {
                    const masterUser = allUsers.find((u: any) => u.id === conn.master_id);
                    return {
                        master_id: conn.master_id,
                        master_name: masterUser ? masterUser.name : "Neznámý mistr"
                    };
                });
                setMasters(results);
            } else {
                setMasters([]);
            }

        } catch (error) {
            console.error("Chyba při načítání detailu učedníka:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalWorkHours = workHours
        .filter(h => h.description?.includes("Práce"))
        .reduce((sum, h) => sum + (h.hours || 0), 0);

    const totalStudyHours = workHours
        .filter(h => h.description?.includes("Studium"))
        .reduce((sum, h) => sum + (h.hours || 0), 0);

    const startDate = apprenticeInfo?.timestamp ? new Date(apprenticeInfo.timestamp).toLocaleDateString("cs-CZ") : "Neznámé";

    const renderProjectItem = ({ item }: { item: any }) => (
        <Pressable
            onPress={() => navigation.navigate("ProjectDetail", {
                project: item,
                projectIndex: projects.indexOf(item)
            })}
        >
            <ThemedView style={styles.projectCard}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.projectImage} />
                ) : (
                    <View style={[styles.projectImagePlaceholder, { backgroundColor: theme.backgroundDefault }]}>
                        <Feather name="image" size={24} color={theme.textSecondary} />
                    </View>
                )}
                <View style={styles.projectInfo}>
                    <ThemedText style={styles.projectTitle}>{item.title}</ThemedText>
                    <ThemedText style={[styles.projectDate, { color: theme.textSecondary }]}>
                        {new Date(item.created_at).toLocaleDateString("cs-CZ")}
                    </ThemedText>
                </View>
            </ThemedView>
        </Pressable>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
            <ScreenKeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>

                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Feather name="user" size={40} color={theme.primary} />
                    </View>
                    <ThemedText style={styles.name}>{apprenticeName}</ThemedText>
                    <ThemedText style={[styles.role, { color: theme.textSecondary }]}>Učedník Svobodných cechů</ThemedText>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Feather name="calendar" size={14} color={theme.textSecondary} />
                            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>Od: {startDate}</ThemedText>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metaItem}>
                            <Feather name="tool" size={14} color={theme.textSecondary} />
                            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>{totalWorkHours}h práce</ThemedText>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metaItem}>
                            <Feather name="book" size={14} color={theme.textSecondary} />
                            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>{totalStudyHours}h studium</ThemedText>
                        </View>
                    </View>
                </View>

                {/* Master Connection */}
                <ThemedView style={styles.masterCard}>
                    <ThemedText style={styles.sectionTitle}>{masters.length > 1 ? "Jeho Mistři" : "Jeho Mistr"}</ThemedText>
                    {masters.length > 0 ? (
                        masters.map((m, idx) => (
                            <Pressable
                                key={m.master_id || idx}
                                style={[styles.masterRow, idx > 0 && { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }]}
                                onPress={() => navigation.navigate("HostMasterDetail", { masterId: m.master_id, masterName: m.master_name })}
                            >
                                <View style={styles.masterIcon}>
                                    <Feather name="shield" size={20} color={theme.primary} />
                                </View>
                                <ThemedText style={styles.masterName}>{m.master_name}</ThemedText>
                                <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                            </Pressable>
                        ))
                    ) : (
                        <ThemedText style={[styles.noMaster, { color: theme.textSecondary }]}>Zatím nepřiřazen k mistrovi</ThemedText>
                    )}
                </ThemedView>

                {/* Successes / Badges */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Úspěchy a Certifikáty</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
                        {certificates.filter(c => !c.locked).map((cert, index) => (
                            <View key={index} style={[styles.badgeItem, { backgroundColor: theme.backgroundSecondary }]}>
                                <Feather name="award" size={24} color={theme.primary} />
                                <ThemedText style={styles.badgeTitle}>{cert.title}</ThemedText>
                            </View>
                        ))}
                        {certificates.filter(c => !c.locked).length === 0 && (
                            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Zatím žádné získané odznaky</ThemedText>
                        )}
                    </ScrollView>
                </View>

                {/* Projects */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>Projekty ({projects.length})</ThemedText>
                    </View>

                    {projects.length > 0 ? (
                        projects.map((item, index) => (
                            <View key={index}>{renderProjectItem({ item })}</View>
                        ))
                    ) : (
                        <ThemedView style={styles.emptyProjects}>
                            <Feather name="folder" size={32} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Žádné projekty k zobrazení</ThemedText>
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
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.md,
    },
    name: {
        fontSize: 26,
        fontWeight: "800",
    },
    role: {
        fontSize: 16,
        marginTop: 4,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: Spacing.lg,
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: "600",
    },
    divider: {
        width: 1,
        height: 14,
        backgroundColor: "rgba(156, 163, 175, 0.3)",
        marginHorizontal: 12,
    },
    masterCard: {
        margin: Spacing.lg,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    section: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: Spacing.md,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    masterRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.sm,
    },
    masterIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: Spacing.md,
    },
    masterName: {
        flex: 1,
        fontSize: 17,
        fontWeight: "600",
    },
    noMaster: {
        fontSize: 15,
        fontStyle: "italic",
    },
    badgeScroll: {
        gap: Spacing.md,
        paddingBottom: 4,
    },
    badgeItem: {
        width: 100,
        height: 110,
        borderRadius: BorderRadius.md,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.md,
    },
    badgeTitle: {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        marginTop: Spacing.sm,
    },
    projectCard: {
        flexDirection: "row",
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        overflow: "hidden",
    },
    projectImage: {
        width: 80,
        height: 80,
    },
    projectImagePlaceholder: {
        width: 80,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    projectInfo: {
        flex: 1,
        padding: Spacing.md,
        justifyContent: "center",
    },
    projectTitle: {
        fontSize: 16,
        fontWeight: "700",
    },
    projectDate: {
        fontSize: 13,
        marginTop: 4,
    },
    emptyProjects: {
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
