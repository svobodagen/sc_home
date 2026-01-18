import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { api, supabase } from "@/services/api";

export interface AppNotification {
    id: number;
    user_id: string;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error" | "admin";
    is_read: boolean;
    created_at: string;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (title: string, message: string, type?: AppNotification["type"]) => void;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Load initial notifications
    useEffect(() => {
        if (user?.id) {
            loadNotifications(user.id);
        } else {
            setNotifications([]);
        }
    }, [user?.id]);

    // Realtime Subscription for NEW notifications
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`notifications-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("Realtime Notification:", payload.new);
                    if (payload.new) {
                        setNotifications(prev => [payload.new as AppNotification, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user?.id]);

    const loadNotifications = async (userId: string) => {
        const data = await api.getNotifications(userId);
        setNotifications(data);
    };

    const addNotification = async (title: string, message: string, type: AppNotification["type"] = "info") => {
        if (!user?.id) return;

        // Optimistic UI update
        const tempId = Date.now();
        const newNotification: AppNotification = {
            id: tempId,
            user_id: user.id,
            title,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString()
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Call API
        await api.createNotification(user.id, title, message, type);
    };

    const markAsRead = async (id: number) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await api.markNotificationRead(id);
    };

    const markAllAsRead = async () => {
        if (!user?.id) return;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await api.markAllNotificationsRead(user.id);
    };

    const clearAll = () => {
        // Not implementing delete for now, maybe just hide? Or implement delete API later.
        // For now clear local is fine but refresh would bring them back if not deleted in DB.
        // Let's just mark as read visually potentially or support delete in future.
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
};
