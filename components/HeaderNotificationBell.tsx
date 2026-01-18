import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationModal } from "@/components/NotificationModal";

export function HeaderNotificationBell() {
    const { theme } = useTheme();
    const { unreadCount } = useNotifications();
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <>
            <NotificationModal visible={modalVisible} onClose={() => setModalVisible(false)} />
            <Pressable
                style={styles.bellContainer}
                onPress={() => setModalVisible(true)}
                hitSlop={10}
            >
                <Feather name="bell" size={24} color={theme.text} />
                {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.error }]}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                    </View>
                )}
            </Pressable>
        </>
    );
}

const styles = StyleSheet.create({
    bellContainer: {
        padding: 8,
    },
    badge: {
        position: "absolute",
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 2,
        borderWidth: 1,
        borderColor: "white",
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
});
