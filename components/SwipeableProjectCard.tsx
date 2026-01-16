import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Animated, PanResponder, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ProjectCard } from "@/components/ProjectCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";


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
}

const DEAD_ZONE = 6; // Dead zone before box moves
const ELASTIC_THRESHOLD = 60;
const SWIPE_THRESHOLD = 120;

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
}: SwipeableProjectCardProps) {
  const { theme } = useTheme();
  const pan = useRef(new Animated.ValueXY()).current;
  const [cardHeight, setCardHeight] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isSwippingRef = useRef(false);
  const hasStartedMovingRef = useRef(false);
  const hideDeleteRef = useRef(hideDelete);

  useEffect(() => {
    hideDeleteRef.current = hideDelete;
  }, [hideDelete]);

  const resetPosition = (triggerEnd = true) => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      tension: 40,
      friction: 7,
    }).start(() => {
      if (triggerEnd && isSwippingRef.current) {
        isSwippingRef.current = false;
        onSwipeEnd?.();
      }
    });
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > DEAD_ZONE && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx } = gestureState;

        // Check if we've passed the dead zone and started actual movement
        if (!hasStartedMovingRef.current && Math.abs(dx) > DEAD_ZONE) {
          hasStartedMovingRef.current = true;
          if (!isSwippingRef.current) {
            isSwippingRef.current = true;
            onSwipeStart?.();
          }
        }

        // Only move the box if we're past the dead zone
        if (Math.abs(dx) > DEAD_ZONE) {
          const adjustedDx = dx > 0 ? dx - DEAD_ZONE : dx + DEAD_ZONE;

          if (adjustedDx > 0) {
            if (adjustedDx <= ELASTIC_THRESHOLD) {
              pan.x.setValue(adjustedDx);
            } else {
              const elasticDx = ELASTIC_THRESHOLD + (adjustedDx - ELASTIC_THRESHOLD) * 0.3;
              pan.x.setValue(Math.min(elasticDx, SWIPE_THRESHOLD));
            }
          }
          else if (adjustedDx < 0) {
            if (adjustedDx >= -ELASTIC_THRESHOLD) {
              pan.x.setValue(adjustedDx);
            } else {
              const elasticDx = -ELASTIC_THRESHOLD + (adjustedDx + ELASTIC_THRESHOLD) * 0.3;
              pan.x.setValue(Math.max(elasticDx, -SWIPE_THRESHOLD));
            }
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        const adjustedDx = Math.abs(dx) > DEAD_ZONE ? (dx > 0 ? dx - DEAD_ZONE : dx + DEAD_ZONE) : 0;

        if (adjustedDx >= SWIPE_THRESHOLD) {
          onEdit();
          resetPosition(false);
          isSwippingRef.current = false;
          hasStartedMovingRef.current = false;
          onSwipeEnd?.();
        }
        else if (adjustedDx <= -SWIPE_THRESHOLD) {
          if (isMaster) {
            onLike?.();
          } else {
            if (hideDeleteRef.current) {
              onDelete();
            } else {
              setShowDeleteConfirm(true);
            }
          }
          resetPosition(false);
          isSwippingRef.current = false;
          hasStartedMovingRef.current = false;
          onSwipeEnd?.();
        }
        else {
          resetPosition(true);
          isSwippingRef.current = false;
          hasStartedMovingRef.current = false;
        }
      },
      onPanResponderTerminate: () => {
        hasStartedMovingRef.current = false;
        isSwippingRef.current = false;
        onSwipeEnd?.();
      },
    })
  ).current;

  return (
    <>
      <View style={styles.container}>
        {/* LEFT SIDE - Edit for non-master (swipe right), Comment for master (swipe left) */}
        <View style={[styles.actionsWrapperLeft, { height: cardHeight }]}>
          {isMaster ? (
            <Pressable
              style={styles.commentContainer}
              onPress={() => {
                resetPosition();
                onEdit();
              }}
            >
              <Feather name="message-circle" size={20} color="#8b5cf6" />
            </Pressable>
          ) : (
            <Pressable
              style={styles.editContainer}
              onPress={() => {
                resetPosition();
                onEdit();
              }}
            >
              <Feather name="edit-2" size={20} color="#8b5cf6" />
            </Pressable>
          )}
        </View>

        {/* RIGHT SIDE - Trash for non-master (swipe left), Heart for master (swipe right) */}
        <View style={[styles.actionsWrapperRight, { height: cardHeight }]}>
          {isMaster ? (
            <Pressable
              style={styles.likeContainer}
              onPress={() => {
                resetPosition();
                onLike?.();
              }}
            >
              <Feather name="heart" size={20} color="#8b5cf6" />
            </Pressable>
          ) : (
            !hideDelete && (
              <Pressable
                style={styles.deleteContainer}
                onPress={() => {
                  setShowDeleteConfirm(true);
                }}
              >
                <Feather name="trash-2" size={20} color="#8b5cf6" />
              </Pressable>
            )
          )}
        </View>

        <Animated.View
          style={[
            styles.cardWrapper,
            { transform: [{ translateX: pan.x }] }
          ]}
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          {...panResponder.panHandlers}
        >
          <ProjectCard
            title={title}
            date={date}
            imageUrl={imageUrl}
            category={category}
            onPress={onPress || (() => { })}
            onEdit={() => {
              resetPosition();
              onEdit();
            }}
            masterComment={masterComment}
            isLiked={isLiked}
            authorName={authorName}
            masterInitials={masterInitials}
            masterName={masterName}
          />
        </Animated.View>
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
    position: "relative",
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  actionsWrapperLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 0,
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  actionsWrapperRight: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 0,
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  cardWrapper: {
    zIndex: 1,
  },
  editContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  deleteContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  likeContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  commentContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  actionText: {
    ...Typography.h4,
    fontWeight: "700",
    color: "#FFFFFF",
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
