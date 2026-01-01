import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import * as Haptics from "expo-haptics";

export interface PickerItem {
  label: string;
  value: number;
  subLabel?: string;
}

interface SlotWheelPickerProps {
  data: PickerItem[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  label?: string;
}

const ITEM_HEIGHT = 28;
const VISIBLE_ITEMS = 3;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export function SlotWheelPicker({
  data,
  selectedValue,
  onValueChange,
  label,
}: SlotWheelPickerProps) {
  const { theme } = useTheme();
  const translateY = useSharedValue(0);
  const startY = useSharedValue(0);

  const getIndexFromValue = useCallback((value: number) => {
    const idx = data.findIndex((item) => item.value === value);
    return idx >= 0 ? idx : 0;
  }, [data]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      try {
        Haptics.selectionAsync();
      } catch (e) {
      }
    }
  }, []);

  const handleValueChange = useCallback((index: number) => {
    if (index >= 0 && index < data.length) {
      triggerHaptic();
      onValueChange(data[index].value);
    }
  }, [data, onValueChange, triggerHaptic]);

  useEffect(() => {
    const currentIndex = getIndexFromValue(selectedValue);
    translateY.value = -currentIndex * ITEM_HEIGHT;
  }, [selectedValue, data]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxTranslate = 0;
      const minTranslate = -(data.length - 1) * ITEM_HEIGHT;
      const newValue = startY.value + event.translationY;
      translateY.value = Math.max(minTranslate, Math.min(maxTranslate, newValue));
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const projected = translateY.value + velocity * 0.1;
      let targetIndex = Math.round(-projected / ITEM_HEIGHT);
      targetIndex = Math.max(0, Math.min(data.length - 1, targetIndex));
      const targetTranslate = -targetIndex * ITEM_HEIGHT;

      translateY.value = withSpring(targetTranslate, {
        damping: 20,
        stiffness: 200,
        velocity: velocity,
      });

      runOnJS(handleValueChange)(targetIndex);
    });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const renderItem = (item: PickerItem, index: number) => {
    return (
      <AnimatedItem
        key={item.value}
        item={item}
        index={index}
        translateY={translateY}
        theme={theme}
      />
    );
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}

      <GestureDetector gesture={panGesture}>
        <View style={[styles.container, { height: CONTAINER_HEIGHT }]}>
          <Animated.View
            style={[
              styles.itemsContainer,
              { paddingTop: ITEM_HEIGHT },
              containerStyle,
            ]}
          >
            {data.map(renderItem)}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

interface AnimatedItemProps {
  item: PickerItem;
  index: number;
  translateY: { value: number };
  theme: any;
}

function AnimatedItem({ item, index, translateY, theme }: AnimatedItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const currentIndex = -translateY.value / ITEM_HEIGHT;
    const distance = Math.abs(index - currentIndex);

    const opacity = interpolate(
      distance,
      [0, 1, 2],
      [1, 0.4, 0.15],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      distance,
      [0, 1, 2],
      [1, 0.85, 0.7],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.item, { height: ITEM_HEIGHT }, animatedStyle]}>
      <View style={styles.itemContent}>
        <ThemedText style={[styles.itemText, { color: theme.text }]}>
          {item.label}
        </ThemedText>
        {item.subLabel ? (
          <ThemedText style={[styles.subLabelText, { color: theme.textSecondary }]}>
            {item.subLabel}
          </ThemedText>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  container: {
    width: 65,
    overflow: "hidden",
  },
  itemsContainer: {
    width: "100%",
  },
  item: {
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  itemText: {
    fontSize: 20,
    fontWeight: "700",
  },
  subLabelText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 2,
  },
});
