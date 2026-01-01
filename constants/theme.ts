// Modern TikTok/Instagram Aesthetic - Clean & Minimal

export const LightColors = {
  // Primary vibrant colors - solid, not gradients
  primary: "#8B5CF6", // Vibrant Purple
  secondary: "#06B6D4", // Electric Turquoise
  accent: "#F472B6", // Accent Pink
  
  // Status colors
  success: "#10B981", // Fresh Green
  warning: "#FBBF24", // Sunny Yellow
  error: "#F87171", // Coral Red
  
  // Craft category colors (solid, vibrant)
  craftWood: "#8B6F47", // Natural Wood Brown
  craftMetal: "#9CA3AF", // Steel Gray
  craftCulinary: "#DC2626", // Food Red
  craftConstruction: "#EA580C", // Construction Orange
  
  // Backgrounds
  backgroundRoot: "#FFFFFF", // Pure White
  backgroundDefault: "#F9FAFB", // Off White
  backgroundSecondary: "#F3F4F6", // Light Gray
  backgroundTertiary: "#E5E7EB", // Lighter Gray
  
  // Text colors
  text: "#111827", // Dark
  textSecondary: "#6B7280", // Medium Gray
  textTertiary: "#9CA3AF", // Light Gray
  
  // UI elements
  border: "#E5E7EB", // Light Gray
  divider: "#F3F4F6",
  
  // Tab bar
  tabIconDefault: "#D1D5DB",
  tabIconSelected: "#8B5CF6",
  
  // Special
  gradient1Start: "#FF6B9D", // Pink
  gradient1End: "#FFA07A", // Peach
  gradient2Start: "#667EEA", // Purple
  gradient2End: "#64B5F6", // Blue
};

export const DarkColors = {
  // Primary vibrant colors
  primary: "#A78BFA", // Lighter Purple
  secondary: "#22D3EE", // Brighter Turquoise
  accent: "#F9A8D4", // Lighter Pink
  
  // Status colors
  success: "#34D399", // Brighter Green
  warning: "#FCD34D", // Brighter Yellow
  error: "#FCA5A5", // Lighter Red
  
  // Craft category colors
  craftWood: "#A68B5B", // Lighter Wood
  craftMetal: "#B4B6BA", // Lighter Steel
  craftCulinary: "#EF4444", // Lighter Red
  craftConstruction: "#FB923C", // Lighter Orange
  
  // Backgrounds
  backgroundRoot: "#111827", // Dark
  backgroundDefault: "#1F2937", // Dark Gray
  backgroundSecondary: "#374151", // Medium Gray
  backgroundTertiary: "#4B5563", // Light Gray
  
  // Text colors
  text: "#F9FAFB", // Almost White
  textSecondary: "#D1D5DB", // Light Gray
  textTertiary: "#9CA3AF", // Medium Gray
  
  // UI elements
  border: "#374151", // Dark Gray
  divider: "#1F2937",
  
  // Tab bar
  tabIconDefault: "#6B7280",
  tabIconSelected: "#A78BFA",
  
  // Special
  gradient1Start: "#FF6B9D",
  gradient1End: "#FFA07A",
  gradient2Start: "#667EEA",
  gradient2End: "#64B5F6",
};

export const Colors = {
  light: LightColors,
  dark: DarkColors,
};

export type Theme = typeof LightColors;

// Spacing system
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  fabSize: 56,
};

// Border radius (modern, clean)
export const BorderRadius = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  full: 999,
};

// Typography
export const Typography = {
  display: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
};

// Shadow styles (minimal, clean)
export const Shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
};
