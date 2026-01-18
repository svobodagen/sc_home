import React from "react";
import { View, Modal, StyleSheet, FlatList, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { useNotifications, AppNotification } from "@/contexts/NotificationContext";
import { Spacing, BorderRadius, Shadow } from "@/constants/theme";

interface NotificationModalProps {
    visible: boolean;
    onClose: () => void;
}

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
    const { theme } = useTheme();
    const { notifications, markAsRead, markAllAsRead } = useNotifications();

    // Sort by unread first, then date
    const sortedNotifications = [...notifications].sort((a, b) => {
        if (a.is_read === b.is_read) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return !a.is_read ? -1 : 1;
    });

    const renderItem = ({ item }: { item: AppNotification }) => {
        const isUnread = !item.is_read;

        // Icon based on type
        let iconName: any = "info";
        let iconColor = theme.primary;

        if (item.type === "error") { iconName = "alert-circle"; iconColor = theme.error; }
        else if (item.type === "success") { iconName = "check-circle"; iconColor = "green"; }
        else if (item.type === "warning") { iconName = "alert-triangle"; iconColor = "orange"; }
        else if (item.type === "admin") { iconName = "shield"; iconColor = theme.secondary; }

        return (
            <Pressable
                style={[
                    styles.itemContainer,
                    {
                        backgroundColor: isUnread ? theme.backgroundSecondary : theme.backgroundRoot,
                        borderColor: theme.border
                    }
                ]}
                onPress={() => markAsRead(item.id)}
            >
                <View style={styles.iconContainer}>
                    <Feather name={iconName} size={24} color={iconColor} />
                    {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.error }]} />}
                </View>
                <View style={styles.textContainer}>
                    <ThemedText style={[styles.title, isUnread && styles.boldTitle]}>{item.title}</ThemedText>
                    <ThemedText style={styles.message} numberOfLines={3}>{item.message}</ThemedText>
                    <ThemedText style={[styles.date, { color: theme.textSecondary }]}>
                        {new Date(item.created_at).toLocaleString('cs-CZ', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                    </ThemedText>
                </View>
                {isUnread && (
                    <View style={styles.actionContainer}>
                        <Feather name="circle" size={16} color={theme.primary} />
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={StyleSheet.absoluteFill}>
                <Pressable style={styles.overlay} onPress={onClose}>
                    <Pressable
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: theme.backgroundRoot,
                                borderColor: theme.border,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 10
                            }
                        ]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: theme.border }]}>
                            <ThemedText type="h3">Oznámení</ThemedText>
                            <View style={styles.headerActions}>
                                {notifications.some(n => !n.is_read) && (
                                    <Pressable onPress={markAllAsRead} style={styles.actionButton}>
                                        <ThemedText style={{ color: theme.primary, fontSize: 13 }}>Přečíst vše</ThemedText>
                                    </Pressable>
                                )}
                                <Pressable onPress={onClose} style={styles.closeButton}>
                                    <Feather name="x" size={24} color={theme.text} />
                                </Pressable>
                            </View>
                        </View>

                        {/* List */}
                        <FlatList
                            data={sortedNotifications}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Feather name="bell-off" size={48} color={theme.textSecondary} />
                                    <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Žádná nová oznámení</ThemedText>
                                </View>
                            }
                        />
                    </Pressable>
                </Pressable>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.md,
    },
    modalContent: {
        width: "100%",
        maxWidth: 500,
        maxHeight: "80%",
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: Spacing.md,
        borderBottomWidth: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    actionButton: {
        padding: 4,
    },
    closeButton: {
        padding: 4,
    },
    listContent: {
        padding: Spacing.sm,
    },
    itemContainer: {
        flexDirection: "row",
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        alignItems: "flex-start",
    },
    iconContainer: {
        marginRight: Spacing.md,
        position: "relative",
        marginTop: 2,
    },
    unreadDot: {
        position: "absolute",
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: "white",
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    boldTitle: {
        fontWeight: "800",
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    date: {
        fontSize: 11,
    },
    actionContainer: {
        marginLeft: Spacing.sm,
        alignSelf: "center",
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.md,
    },
    emptyText: {
        fontSize: 16,
    },
});
