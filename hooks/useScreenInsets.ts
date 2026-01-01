import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Spacing } from "@/constants/theme";

export function useScreenInsets(options?: { hasTransparentHeader?: boolean }) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    // If we're not in a tab navigator, default to 0
    tabBarHeight = 0;
  }

  const { hasTransparentHeader = false } = options || {};

  return {
    top: hasTransparentHeader ? headerHeight + Spacing.xl : Spacing.xl,
    bottom: tabBarHeight + Spacing.xl,
    paddingTop: hasTransparentHeader ? headerHeight + Spacing.xl : Spacing.xl,
    paddingBottom: tabBarHeight + Spacing.xl,
    scrollInsetBottom: insets.bottom + 16,
  };
}
