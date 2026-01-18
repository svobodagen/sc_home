import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, ScrollView, Image, Modal } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius, Typography, Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";
import { useNavigation } from "@react-navigation/native";
import { calculateBadgeStatus, BadgeDisplayData } from "@/services/BadgeCalculator";
import { AchievementBadge } from "@/components/AchievementBadge";

export default function HostApprenticeDetailScreen({ route }: any) {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();
    const { apprenticeId, apprenticeName } = route.params;
    const { allUsers } = useData();

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);
    const [displayBadges, setDisplayBadges] = useState<BadgeDisplayData[]>([]);
    const [displayCerts, setDisplayCerts] = useState<BadgeDisplayData[]>([]);
    const [masters, setMasters] = useState<any[]>([]);
    const [apprenticeInfo, setApprenticeInfo] = useState<any>(null);
    const [workHours, setWorkHours] = useState<any[]>([]);

    const [selectedBadge, setSelectedBadge] = useState<BadgeDisplayData | null>(null);

    useEffect(() => {
        loadData();
    }, [apprenticeId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Fetch data
            const [dbCerts, hours, projs, templates, mstrConns, allRules, history] = await Promise.all([
                api.getCertificates(apprenticeId).catch(() => []),
                api.getWorkHours(apprenticeId).catch(() => []),
                api.getProjects(apprenticeId).catch(() => []),
                api.getCertificateTemplates().catch(() => []),
                api.getMastersForApprentice(apprenticeId).catch(() => []),
                api.getAllCertificateUnlockRules().catch(() => []),
                api.getCertificateUnlockHistory(apprenticeId).catch(() => [])
            ]);

            const info = allUsers.find((u: any) => u.id === apprenticeId);
            setApprenticeInfo(info);
            setProjects(projs);
            setWorkHours(hours);

            // Prepare Stats
            const wSum = hours.filter((h: any) => h.description && /pr[áa]ce|work/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);
            const sSum = hours.filter((h: any) => h.description && /studium|study/i.test(h.description)).reduce((s: number, h: any) => s + (h.hours || h.duration || 0), 0);

            const stats = {
                workHours: wSum,
                studyHours: sSum,
                totalHours: wSum + sSum,
                projectCount: projs.length
            };

            // Calculate Badges
            // Role: "Host" -> Calculator will allow showing initials of whoever unlocked it.
            const processed: BadgeDisplayData[] = templates.map((tmpl: any) => {
                const relevantRecords = dbCerts.filter((c: any) => String(c.template_id) === String(tmpl.id));
                const tmplRules = allRules.filter((r: any) => r.template_id === tmpl.id);

                return calculateBadgeStatus(tmpl, {
                    role: "Host",
                    userStats: stats,
                    dbRecords: relevantRecords,
                    rules: tmplRules,
                    allUsers: allUsers,
                    unlockHistory: history,
                    // No specific master filter, host sees all unlocked items
                });
            });

            // Sort by ID (Robust)
            processed.sort((a, b) => {
                const idA = parseInt(a.templateId);
                const idB = parseInt(b.templateId);
                if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
                return String(a.templateId).localeCompare(String(b.templateId));
            });

            // Host only sees unlocked items? Or all? Usually detail screens show what was achieved.
            // Host only sees unlocked items (earned badges/certificates) AND those with initials (attributed/confirmed)
            // This prevents showing "calculated but not synced" badges that users consider "inactive".
            const unlockedItems = processed.filter(i => !i.isLocked && i.initials.length > 0);

            setDisplayBadges(unlockedItems.filter(i => i.category === "Odznak"));
            setDisplayCerts(unlockedItems.filter(i => i.category === "Certifikát"));

            // Masters
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
            console.error("Error loading Host detail:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalWorkHours = workHours
        .filter(h => (h.description || "").match(/pr[áa]ce|work/i))
        .reduce((sum, h) => sum + (h.hours || 0), 0);

    const totalStudyHours = workHours
        .filter(h => (h.description || "").match(/studium|study/i))
        .reduce((sum, h) => sum + (h.hours || 0), 0);

    const startDate = apprenticeInfo?.timestamp ? new Date(apprenticeInfo.timestamp).toLocaleDateString("cs-CZ") : "Neznámé";

    const renderProjectItem = ({ item }: { item: any }) => (
        <Pressable
            onPress={() => navigation.navigate("ProjectDetail", {
                project: item,
                projectIndex: projects.indexOf(item),
                apprenticeId: apprenticeId
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

    // Modal Config
    const ModalContent = () => {
        if (!selectedBadge) return null;
        const item = selectedBadge;
        const primaryColor = item.category === "Odznak" ? theme.primary : theme.secondary;

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
                                borderColor: primaryColor,
                            },
                        ]}
                    >
                        <View style={[styles.modalIconContainer, { backgroundColor: primaryColor + "20" }]}>
                            <Feather name={item.category === "Odznak" ? "award" : "file-text"} size={48} color={primaryColor} />
                        </View>

                        <ThemedText style={[styles.modalTitle, { color: primaryColor, fontWeight: "700" }]}>
                            {item.headerTitle}
                        </ThemedText>

                        <ThemedText style={[styles.modalCategory, { color: theme.textSecondary }]}>
                            {item.category}
                        </ThemedText>

                        <View style={[styles.masterNameBox, { marginTop: Spacing.sm }]}>
                            {/* For Host, we show who unlocked it (Master Initials? No, Full Name in Modal) 
                      BadgeCalculator provides 'infoText' which might say "Master: XY" if we set it up.
                      Or we can parse 'initials' back to names if needed, but 'infoText' is safer.
                  */}
                            <ThemedText style={[styles.masterNameLabel, { color: theme.textSecondary, textAlign: 'center' }]}>
                                {item.infoText.split(": ")[0]}:{"\n"}
                                <ThemedText style={{ color: primaryColor, fontWeight: '600' }}>
                                    {item.infoText.split(": ")[1] || ""}
                                </ThemedText>
                            </ThemedText>
                        </View>

                        <View style={[styles.requirementBox, { backgroundColor: theme.backgroundRoot, borderColor: primaryColor }]}>
                            <ThemedText style={[styles.requirementLabel, { color: theme.textSecondary }]}>
                                Podmínky pro získání:
                            </ThemedText>
                            <ThemedText style={[styles.requirementText, { color: theme.text }]}>
                                {item.ruleText}
                            </ThemedText>
                        </View>

                        <Pressable
                            onPress={() => setSelectedBadge(null)}
                            style={[styles.closeButton, { backgroundColor: primaryColor }]}
                        >
                            <ThemedText style={styles.closeButtonText}>Zavřít</ThemedText>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

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
                            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>{Math.round(totalWorkHours)}h práce</ThemedText>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metaItem}>
                            <Feather name="book" size={14} color={theme.textSecondary} />
                            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>{Math.round(totalStudyHours)}h studium</ThemedText>
                        </View>
                    </View>
                </View>

                {/* Master Connection */}
                <ThemedView style={[styles.masterCard, { borderWidth: 1, borderColor: theme.border }]}>
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
                    <ThemedText style={styles.sectionTitle}>Odznaky</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
                        {displayBadges.length > 0 ? (
                            displayBadges.map((badge) => (
                                <View key={badge.templateId} style={{ marginRight: Spacing.md }}>
                                    <AchievementBadge item={badge} onPress={() => setSelectedBadge(badge)} />
                                </View>
                            ))
                        ) : (
                            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Zatím žádné získané odznaky</ThemedText>
                        )}
                    </ScrollView>
                </View>

                {/* Certificates */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Certifikáty</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
                        {displayCerts.length > 0 ? (
                            displayCerts.map((cert) => (
                                <View key={cert.templateId} style={{ marginRight: Spacing.md }}>
                                    <AchievementBadge item={cert} onPress={() => setSelectedBadge(cert)} />
                                </View>
                            ))
                        ) : (
                            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Zatím žádné získané certifikáty</ThemedText>
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

                <ModalContent />
            </ScreenKeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
    },
    header: {
        alignItems: "center",
        padding: Spacing.xl,
        paddingTop: Spacing["2xl"],
    },
    avatarContainer: {
        width: 100,
        height: 100,
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
        minHeight: 110,
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
    miniBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        paddingHorizontal: 2,
    },
    miniBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
        lineHeight: 12,
    },
    masterNameBox: {
        marginBottom: Spacing.sm,
    },
    masterNameLabel: {
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        width: "85%",
        borderWidth: 2,
        alignItems: "center",
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.sm,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: Spacing.xs,
    },
    modalCategory: {
        fontSize: 16,
        marginBottom: Spacing.md,
    },
    requirementBox: {
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        padding: Spacing.lg,
        width: "100%",
        marginBottom: Spacing.lg,
    },
    requirementLabel: {
        fontSize: 13,
        marginBottom: 4,
    },
    requirementText: {
        fontSize: 15,
    },
    closeButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: BorderRadius.xs,
        width: '100%',
        alignItems: 'center'
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: '700'
    },
});
