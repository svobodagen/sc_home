import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Text, Modal, TextInput } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { api } from "@/services/api";
import { useNavigation } from "@react-navigation/native";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { ProjectCard } from "@/components/ProjectCard";

export function GlobalProjectGallery() {
    const insets = useScreenInsets();
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [projects, setProjects] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [apprentices, setApprentices] = useState<any[]>([]);
    const [masters, setMasters] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters and settings
    const [selectedApprentice, setSelectedApprentice] = useState<string | null>(null);
    const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [apprenticeDropdownOpen, setApprenticeDropdownOpen] = useState(false);
    const [masterDropdownOpen, setMasterDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const resetFilters = () => {
        setSelectedApprentice(null);
        setSelectedMaster(null);
        setSearchQuery("");
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [allProjects, users, allConnections] = await Promise.all([
                api.getAllProjects(),
                api.getUsers(),
                api.getAllMasterApprenticeConnections()
            ]);

            setAllUsers(users);
            setProjects(allProjects);
            setConnections(allConnections);

            const apprs = users.filter((u: any) => u.role === "Učedník")
                .sort((a, b) => a.name.localeCompare(b.name));
            const mstrs = users.filter((u: any) => u.role === "Mistr")
                .sort((a, b) => a.name.localeCompare(b.name));

            setApprentices(apprs);
            setMasters(mstrs);
        } catch (error) {
            console.error("Chyba při načítání projektů pro galerii:", error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredAndSortedProjects = () => {
        let filtered = [...projects];

        if (selectedApprentice) {
            filtered = filtered.filter(p => p.user_id === selectedApprentice);
        }

        if (selectedMaster) {
            filtered = filtered.filter(p => p.master_id === selectedMaster);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
                (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
                (p.master_comment && p.master_comment.toLowerCase().includes(lowerQuery))
            );
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });

        return filtered;
    };

    const filteredProjects = getFilteredAndSortedProjects();

    const renderProjectList = ({ item, index }: { item: any, index: number }) => {
        const apprentice = allUsers.find(u => u.id === item.user_id);
        const master = allUsers.find(u => u.id === item.master_id);
        const date = item.created_at ? new Date(item.created_at) : null;
        const formattedDate = date ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}` : "—";
        const hasComment = item.master_comment && item.master_comment.trim().length > 0;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.projectListItem,
                    { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => navigation.navigate("ProjectDetail", {
                    project: item,
                    projectIndex: index,
                    apprenticeId: item.user_id,
                    isGlobal: true,
                    projectList: filteredProjects
                })}
            >
                {item.image && (
                    <Image source={{ uri: item.image }} style={styles.projectThumbnail} />
                )}
                <View style={styles.projectListInfo}>
                    <View style={styles.projectListRow}>
                        <ThemedText style={styles.projectDate}>{formattedDate}</ThemedText>
                        {hasComment && (
                            <View style={[styles.commentBadge, { backgroundColor: theme.primary }]}>
                                <Feather name="message-circle" size={12} color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                    <ThemedText style={styles.projectListTitle} numberOfLines={1}>{item.title}</ThemedText>
                    <View style={styles.projectListRow}>
                        <ThemedText style={[styles.projectListLabel, { color: theme.textSecondary }]}>
                            Učedník: <ThemedText style={{ color: theme.text }}>{apprentice?.name || "—"}</ThemedText>
                        </ThemedText>
                    </View>
                    <View style={styles.projectListRow}>
                        <ThemedText style={[styles.projectListLabel, { color: theme.textSecondary }]}>
                            Mistr: <ThemedText style={{ color: theme.text }}>{master?.name || "Nepřiřazen"}</ThemedText>
                        </ThemedText>
                    </View>
                </View>
            </Pressable>
        );
    };

    const renderProjectGrid = ({ item, index }: { item: any; index: number }) => {
        const apprentice = allUsers.find(u => u.id === item.user_id);
        const master = allUsers.find(u => u.id === item.master_id);
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString("cs-CZ") : "—";

        return (
            <View style={styles.projectGridItem}>
                <ProjectCard
                    title={item.title}
                    date={date}
                    imageUrl={item.image ? { uri: item.image } : undefined}
                    category={item.category || "Další"}
                    onPress={() => navigation.navigate("ProjectDetail", {
                        project: item,
                        projectIndex: index,
                        apprenticeId: item.user_id,
                        isGlobal: true,
                        projectList: filteredProjects
                    })}
                    masterComment={item.master_comment}
                    authorName={apprentice?.name}
                    masterName={master?.name}
                />
            </View>
        );
    };

    const renderFilters = () => (
        <View style={styles.filtersContainer}>
            <View style={styles.titleRow}>
                <ThemedText style={styles.sectionTitle}>Projekty</ThemedText>
                {(selectedApprentice || selectedMaster || searchQuery.length > 0) && (
                    <Pressable onPress={resetFilters} hitSlop={10}>
                        <Feather name="x-circle" size={24} color={theme.textSecondary} />
                    </Pressable>
                )}
            </View>

            {/* Dropdown Filter Buttons */}
            <View style={styles.filterButtonsRow}>
                <View style={styles.filterButtonWrapper}>
                    <ThemedText style={[styles.filterLabelOutside, { color: theme.primary }]}>UČEDNÍK</ThemedText>
                    <Pressable
                        style={[styles.filterButton, { backgroundColor: theme.primary + "0D", borderColor: theme.primary + "1A" }]}
                        onPress={() => {
                            setApprenticeDropdownOpen(!apprenticeDropdownOpen);
                            setMasterDropdownOpen(false);
                        }}
                    >
                        <ThemedText style={[styles.filterValue, { color: theme.primary }]} numberOfLines={1}>
                            {selectedApprentice
                                ? (apprentices.find(a => a.id === selectedApprentice)?.name || "Neznámý")
                                : "Všichni"}
                        </ThemedText>
                        <Feather name={apprenticeDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.primary} />
                    </Pressable>
                </View>

                <View style={styles.filterButtonWrapper}>
                    <ThemedText style={[styles.filterLabelOutside, { color: theme.secondary }]}>MISTR</ThemedText>
                    <Pressable
                        style={[styles.filterButton, { backgroundColor: theme.secondary + "0D", borderColor: theme.secondary + "1A" }]}
                        onPress={() => {
                            setMasterDropdownOpen(!masterDropdownOpen);
                            setApprenticeDropdownOpen(false);
                        }}
                    >
                        <ThemedText style={[styles.filterValue, { color: theme.secondary }]} numberOfLines={1}>
                            {selectedMaster
                                ? (masters.find(m => m.id === selectedMaster)?.name || "Neznámý")
                                : "Všichni"}
                        </ThemedText>
                        <Feather name={masterDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.secondary} />
                    </Pressable>
                </View>
            </View>

            {/* Sort and View Mode */}
            <View style={styles.controlsRow}>
                <View style={styles.sortButtons}>
                    <Pressable
                        style={[
                            styles.sortButton,
                            sortOrder === "newest" && { borderColor: theme.error, borderWidth: 2, backgroundColor: "transparent" }
                        ]}
                        onPress={() => setSortOrder("newest")}
                    >
                        <Feather name="arrow-down" size={20} color={sortOrder === "newest" ? theme.error : theme.text} />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.sortButton,
                            sortOrder === "oldest" && { borderColor: theme.error, borderWidth: 2, backgroundColor: "transparent" }
                        ]}
                        onPress={() => setSortOrder("oldest")}
                    >
                        <Feather name="arrow-up" size={20} color={sortOrder === "oldest" ? theme.error : theme.text} />
                    </Pressable>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    {searchQuery.length === 0 && (
                        <Feather name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    )}
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder={searchQuery.length === 0 ? "Hledat..." : ""}
                        placeholderTextColor={theme.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.viewButtons}>
                    <Pressable
                        style={[
                            styles.viewButton,
                            viewMode === "grid" && { borderColor: theme.error, borderWidth: 2, backgroundColor: "transparent" }
                        ]}
                        onPress={() => setViewMode("grid")}
                    >
                        <Feather name="grid" size={20} color={viewMode === "grid" ? theme.error : theme.text} />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.viewButton,
                            viewMode === "list" && { borderColor: theme.error, borderWidth: 2, backgroundColor: "transparent" }
                        ]}
                        onPress={() => setViewMode("list")}
                    >
                        <Feather name="list" size={20} color={viewMode === "list" ? theme.error : theme.text} />
                    </Pressable>
                </View>
            </View>
        </View>
    );

    const renderSelectionModal = () => {
        const isApprentice = apprenticeDropdownOpen;
        const visible = apprenticeDropdownOpen || masterDropdownOpen;
        let displayData = isApprentice ? apprentices : masters;

        if (isApprentice && selectedMaster) {
            const connectedIds = new Set(connections
                .filter(c => c.master_id === selectedMaster)
                .map(c => c.apprentice_id));
            displayData = apprentices.filter(a => connectedIds.has(a.id));
        } else if (!isApprentice && selectedApprentice) {
            const connectedIds = new Set(connections
                .filter(c => c.apprentice_id === selectedApprentice)
                .map(c => c.master_id));
            displayData = masters.filter(m => connectedIds.has(m.id));
        }

        const data = displayData;
        const title = isApprentice ? "Propojení učedníci" : "Propojení mistři";
        const color = isApprentice ? theme.primary : theme.secondary;
        const selectedId = isApprentice ? selectedApprentice : selectedMaster;

        const handleSelect = (id: string | null) => {
            if (isApprentice) {
                setSelectedApprentice(id);
                setApprenticeDropdownOpen(false);
            } else {
                setSelectedMaster(id);
                setMasterDropdownOpen(false);
            }
        };

        return (
            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setApprenticeDropdownOpen(false);
                    setMasterDropdownOpen(false);
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        setApprenticeDropdownOpen(false);
                        setMasterDropdownOpen(false);
                    }}
                >
                    <View style={[styles.modalContent, { borderWidth: 2, borderColor: color, backgroundColor: theme.backgroundRoot + "E6" }]}>
                        <View style={{ flexShrink: 1, backgroundColor: color + "0D" }}>
                            <View style={[styles.modalHeader, { borderBottomColor: color + "1A" }]}>
                                <ThemedText style={[styles.modalTitle, { color: color }]}>{title}</ThemedText>
                                <Pressable
                                    onPress={() => {
                                        setApprenticeDropdownOpen(false);
                                        setMasterDropdownOpen(false);
                                    }}
                                >
                                    <Feather name="x" size={24} color={color} />
                                </Pressable>
                            </View>

                            <FlatList
                                data={[
                                    { id: "all", name: isApprentice ? "Všichni učedníci" : "Všichni mistři", isAll: true },
                                    ...data
                                ]}
                                keyExtractor={(item) => item.id}
                                style={styles.modalList}
                                contentContainerStyle={{ flexGrow: 1 }}
                                renderItem={({ item }) => {
                                    if (item.isAll) {
                                        const isSelected = !selectedId;
                                        return (
                                            <Pressable
                                                style={[
                                                    styles.modalItem,
                                                    { borderBottomColor: color + "20" },
                                                    isSelected && { backgroundColor: color + "99", borderBottomWidth: 0 }
                                                ]}
                                                onPress={() => handleSelect(null)}
                                            >
                                                <Text style={[
                                                    styles.modalItemText,
                                                    { color: color, fontWeight: "400" },
                                                    isSelected && { fontWeight: "700", color: "#FFFFFF" }
                                                ]}>
                                                    {item.name}
                                                </Text>
                                                {isSelected && <Feather name="check" size={20} color="#FFFFFF" />}
                                            </Pressable>
                                        );
                                    }

                                    const isSelected = selectedId === item.id;
                                    let totalCount = 0;
                                    let sharedCount = 0;
                                    const showShared = (isApprentice && selectedMaster) || (!isApprentice && selectedApprentice);

                                    if (isApprentice) {
                                        totalCount = projects.filter(p => p.user_id === item.id).length;
                                        if (selectedMaster) {
                                            sharedCount = projects.filter(p => p.user_id === item.id && p.master_id === selectedMaster).length;
                                        }
                                    } else {
                                        totalCount = projects.filter(p => p.master_id === item.id).length;
                                        if (selectedApprentice) {
                                            sharedCount = projects.filter(p => p.master_id === item.id && p.user_id === selectedApprentice).length;
                                        }
                                    }
                                    const countText = showShared ? `(${totalCount}/${sharedCount})` : `(${totalCount})`;

                                    return (
                                        <Pressable
                                            style={[
                                                styles.modalItem,
                                                { borderBottomColor: color + "20" },
                                                isSelected && { backgroundColor: color + "99", borderBottomWidth: 0 }
                                            ]}
                                            onPress={() => handleSelect(item.id)}
                                        >
                                            <Text style={[
                                                styles.modalItemText,
                                                { color: color, fontWeight: "400" },
                                                isSelected && { fontWeight: "700", color: "#FFFFFF" }
                                            ]}>
                                                {item.name} <Text style={{ fontSize: 14, opacity: 0.8 }}>{countText}</Text>
                                            </Text>
                                            {isSelected && <Feather name="check" size={20} color="#FFFFFF" />}
                                        </Pressable>
                                    );
                                }}
                            />
                        </View>
                    </View>
                </Pressable>
            </Modal>
        );
    };

    return (
        <View style={styles.container}>
            {renderSelectionModal()}
            <FlatList
                data={filteredProjects}
                renderItem={viewMode === "grid" ? renderProjectGrid : renderProjectList}
                keyExtractor={(item) => item.id}
                numColumns={1} // Note: This structure supports switching views if needed, but grid items currently handle their own width
                key={viewMode}
                ListHeaderComponent={renderFilters()}
                contentContainerStyle={[
                    styles.projectsListContent,
                    { paddingBottom: insets.paddingBottom + 20 }
                ]}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={loadData}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="folder" size={48} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                            {loading ? "Načítám projekty..." : "Žádné projekty nenalezeny"}
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
    filtersContainer: {
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(156, 163, 175, 0.2)",
    },
    sectionTitle: {
        fontSize: 24,
        lineHeight: 32,
        fontWeight: "800",
        textAlign: "center",
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    filterButtonsRow: {
        flexDirection: "row",
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    filterButtonWrapper: {
        flex: 1,
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.sm,
        height: 40,
        borderRadius: BorderRadius.sm,
        borderWidth: 2,
    },
    filterLabelOutside: {
        fontSize: 10,
        fontWeight: "700",
        marginBottom: 2,
        marginLeft: Spacing.sm + 2,
        textTransform: "uppercase",
        opacity: 0.8,
    },
    filterValue: {
        fontSize: 14,
        fontWeight: "700",
        flex: 1,
        marginRight: Spacing.sm,
    },
    controlsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Spacing.sm,
    },
    sortButtons: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    sortButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.sm,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(156, 163, 175, 0.3)",
    },
    searchContainer: {
        flex: 1,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: "rgba(156, 163, 175, 0.3)",
        borderRadius: BorderRadius.sm,
        marginHorizontal: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        height: "100%",
        fontSize: 14,
    },
    viewButtons: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    viewButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.sm,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(156, 163, 175, 0.3)",
    },
    projectsListContent: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    projectGridItem: {
        flex: 1,
        maxWidth: "100%",
        paddingHorizontal: Spacing.xs,
        paddingBottom: Spacing.md,
    },
    projectListItem: {
        flexDirection: "row",
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        overflow: "hidden",
        padding: 0,
    },
    projectThumbnail: {
        width: 116,
        height: "100%",
        borderRadius: 0,
    },
    projectListInfo: {
        flex: 1,
        gap: 4,
        justifyContent: "center",
        padding: Spacing.md,
    },
    projectListRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    projectDate: {
        fontSize: 12,
        fontWeight: "600",
        opacity: 0.7,
    },
    commentBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    projectListTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginVertical: 2,
    },
    projectListLabel: {
        fontSize: 12,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        padding: Spacing.xl,
    },
    modalContent: {
        backgroundColor: "rgba(255, 255, 255, 0.90)",
        borderRadius: BorderRadius.lg,
        maxHeight: "60%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: Spacing.lg,
        borderBottomWidth: 2,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    modalList: {
        paddingVertical: Spacing.sm,
    },
    modalItem: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(156, 163, 175, 0.1)",
    },
    modalItemText: {
        fontSize: 16,
    },
});
