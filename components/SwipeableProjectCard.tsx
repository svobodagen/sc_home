import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Animated, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ProjectCard } from "@/components/ProjectCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { RectButton } from "react-native-gesture-handler";

interface SwipeableProjectCardProps {
  title: string;
  date: string;
  imageUrl?: any;
  category: string;
  onEdit: () => void;
  onDelete: () => void;
  onPress?: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  masterComment?: string;
  hideDelete?: boolean;
  isMaster?: boolean;
  onLike?: () => void;
  isLiked?: boolean;
  authorName?: string;
  masterInitials?: string;
  masterName?: string;
  description?: string;
}

export function SwipeableProjectCard({
  title,
  date,
  imageUrl,
  category,
  onEdit,
  onDelete,
  onPress,
  onSwipeStart,
  onSwipeEnd,
  masterComment,
  hideDelete,
  isMaster,
  onLike,
  isLiked,
  authorName,
  masterInitials,
  masterName,
  description,
}: SwipeableProjectCardProps) {
  const { theme } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.8, 1],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.actionsWrapperLeft}>
        <RectButton
          style={[styles.actionButton, styles.leftAction]}
          onPress={() => {
            swipeableRef.current?.close();
            onEdit();
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Feather
              name={isMaster ? "message-circle" : "edit-2"}
              size={24}
              color="#8b5cf6"
            />
          </Animated.View>
        </RectButton>
      </View>
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    if (!isMaster && hideDelete) return null;

    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.8],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.actionsWrapperRight}>
        <RectButton
          style={[styles.actionButton, styles.rightAction]}
          onPress={() => {
            swipeableRef.current?.close();
            if (isMaster) {
              onLike?.();
            } else {
              if (hideDelete) {
                onDelete();
              } else {
                setShowDeleteConfirm(true);
              }
            }
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Feather
              name={isMaster ? "heart" : "trash-2"}
              size={24}
              color="#8b5cf6"
            />
          </Animated.View>
        </RectButton>
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <Swipeable
          ref={swipeableRef}
          friction={2}
          leftThreshold={80}
          rightThreshold={80}
          renderLeftActions={renderLeftActions}
          renderRightActions={renderRightActions}
          onSwipeableOpen={() => {
            // No-op, handled in onSwipeableWillOpen
          }}
          onSwipeableWillOpen={(direction) => {
            onSwipeStart?.();
            if (direction === "left") {
              // Swiped right (to reveal left actions) -> Edit / Comment
              swipeableRef.current?.close();
              onEdit();
            } else if (direction === "right") {
              // Swiped left (to reveal right actions) -> Delete / Like
              swipeableRef.current?.close();
              if (isMaster) {
                onLike?.();
              } else {
                if (hideDelete) {
                  onDelete();
                } else {
                  setShowDeleteConfirm(true);
                }
              }
            }
          }}
          onSwipeableClose={() => onSwipeEnd?.()}
        >
          <ProjectCard
            title={title}
            date={date}
            imageUrl={imageUrl}
            category={category}
            onPress={onPress || (() => { })}
            onEdit={() => {
              swipeableRef.current?.close();
              onEdit();
            }}
            masterComment={masterComment}
            isLiked={isLiked}
            authorName={authorName}
            masterInitials={masterInitials}
            masterName={masterName}
            description={description}
          />
        </Swipeable>
      </View>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.modalTitle}>Smaž projekt</ThemedText>
            <ThemedText style={styles.modalMessage}>Opravdu chceš smazat tento projekt?</ThemedText>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <ThemedText style={styles.modalButtonText}>Zrušit</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.modalButton, { backgroundColor: "#FF3B30" }]}
                onPress={handleDeleteConfirm}
              >
                <ThemedText style={[styles.modalButtonText, { color: "#FFFFFF" }]}>Smaž</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
    // overflow: "hidden", // Removed to allow natural swipe movement without masking
    backgroundColor: "transparent",
  },
  actionsWrapperLeft: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsWrapperRight: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  leftAction: {
    backgroundColor: "transparent",
  },
  rightAction: {
    backgroundColor: "transparent",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  modalButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
