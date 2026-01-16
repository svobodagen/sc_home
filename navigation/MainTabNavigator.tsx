import React, { useMemo } from "react";
import { Project } from "@/contexts/DataContext";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

import DashboardScreen from "@/screens/DashboardScreen";
import ProjectsScreen from "@/screens/ProjectsScreen";
import HodinyXScreen from "@/screens/HodinyXScreen";
import BadgesScreen from "@/screens/BadgesScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import MastersScreen from "@/screens/MastersScreen";
import AdminScreen from "@/screens/AdminScreen";
import MasterProjectsScreen from "@/screens/MasterProjectsScreen";
import MasterHoursScreen from "@/screens/MasterHoursScreen";
import MasterBadgesScreen from "@/screens/MasterBadgesScreen";
import HostDashboardScreen from "@/screens/HostDashboardScreen";
import HostProjectsScreen from "@/screens/HostProjectsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { ApprenticeHeaderTitle } from "@/components/ApprenticeHeaderTitle";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProjectDetailScreen from "@/screens/ProjectDetailScreen";
import ApprenticeDetailScreen from "@/screens/ApprenticeDetailScreen";
import HostApprenticeDetailScreen from "@/screens/HostApprenticeDetailScreen";
import HostMasterDetailScreen from "@/screens/HostMasterDetailScreen";

export type MainTabParamList = {
  DashboardTab: undefined;
  GuildOverviewTab: undefined;
  ProjectsTab: undefined;
  HoursTab: undefined;
  BadgesTab: undefined;
  AdminTab: undefined;
  ProfileTab: undefined;
};

// Sub-stack param lists
export type DashboardStackParamList = {
  DashboardHome: undefined;
  ProjectDetail: { project: Project; projectIndex: number; apprenticeId?: string; isGlobal?: boolean };
  HostApprenticeDetail: { apprenticeId: string; apprenticeName: string };
  HostMasterDetail: { masterId: string; masterName: string };
  ApprenticeDetail: { apprenticeId: string; apprenticeName: string };
};

export type ProjectsStackParamList = {
  ProjectsHome: undefined;
  ProjectDetail: { project: Project; projectIndex: number; apprenticeId?: string; isGlobal?: boolean };
  HostApprenticeDetail: { apprenticeId: string; apprenticeName: string };
};

export type GuildOverviewStackParamList = {
  GuildOverviewHome: undefined;
  HostApprenticeDetail: { apprenticeId: string; apprenticeName: string };
  HostMasterDetail: { masterId: string; masterName: string };
  ProjectDetail: { project: Project; projectIndex: number; apprenticeId?: string; isGlobal?: boolean };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const ProjectsStack = createNativeStackNavigator<ProjectsStackParamList>();
const GuildOverviewStack = createNativeStackNavigator<GuildOverviewStackParamList>();

function DashboardStackNavigator() {
  const { user } = useAuth();
  const isGuest = user?.role === "Host";

  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen
        name="DashboardHome"
        component={isGuest ? HostDashboardScreen : DashboardScreen}
      />
      <DashboardStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <DashboardStack.Screen name="HostApprenticeDetail" component={HostApprenticeDetailScreen} />
      <DashboardStack.Screen name="HostMasterDetail" component={HostMasterDetailScreen} />
      <DashboardStack.Screen name="ApprenticeDetail" component={ApprenticeDetailScreen} />
    </DashboardStack.Navigator>
  );
}

function ProjectsStackNavigator() {
  const { user } = useAuth();
  const isMaster = user?.role === "Mistr";
  const isHost = user?.role === "Host";

  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen
        name="ProjectsHome"
        component={isHost ? HostProjectsScreen : (isMaster ? MasterProjectsScreen : ProjectsScreen)}
      />
      <ProjectsStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <ProjectsStack.Screen name="HostApprenticeDetail" component={HostApprenticeDetailScreen} />
    </ProjectsStack.Navigator>
  );
}

function GuildOverviewStackNavigator() {
  return (
    <GuildOverviewStack.Navigator screenOptions={{ headerShown: false }}>
      <GuildOverviewStack.Screen name="GuildOverviewHome" component={HostDashboardScreen} />
      <GuildOverviewStack.Screen name="HostApprenticeDetail" component={HostApprenticeDetailScreen} />
      <GuildOverviewStack.Screen name="HostMasterDetail" component={HostMasterDetailScreen} />
      <GuildOverviewStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </GuildOverviewStack.Navigator>
  );
}

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const isMaster = user?.role === "Mistr";
  const isAdmin = user?.role === "Admin";
  const isGuest = user?.role === "Host";

  return (
    <Tab.Navigator
      initialRouteName={isAdmin ? "AdminTab" : (isGuest ? "GuildOverviewTab" : "DashboardTab")}
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#111827",
          borderTopWidth: 0,
          height: 80 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
          paddingHorizontal: isGuest ? "20%" : 0, // Vystředění pro Host (jen 2 ikony)
        },
        tabBarBackground: () => <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />,
        headerShown: true,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: theme.backgroundDefault,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          height: 125,
        },
        headerTitleAlign: "center",
        headerTitleContainerStyle: {
          height: '100%',
          justifyContent: 'flex-end',
          paddingBottom: 20, // Space for the floating badge
        },
        headerTitleStyle: {
          // This ensures the content below knows where the header ends
        },
        headerTintColor: theme.text,
        headerRight: () => (
          <Pressable
            onPress={() => navigation.navigate("ProfileTab")}
            style={{ marginRight: Spacing.lg, padding: 8, marginTop: -36 }}
          >
            <Feather name="more-vertical" size={26} color={theme.text} />
          </Pressable>
        ),
        tabBarItemStyle: {
          height: 60,
          justifyContent: "center",
          alignItems: "center",
        },
      })}
    >
      {!isAdmin && !isGuest && (
        <Tab.Screen
          name="DashboardTab"
          component={DashboardStackNavigator}
          options={{
            headerTitle: () => <ApprenticeHeaderTitle />,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Feather name="home" size={24} color={focused ? "#A855F7" : color} />
              </View>
            ),
          }}
        />
      )}
      {!isAdmin && !isGuest && (
        <Tab.Screen
          name="HoursTab"
          component={isMaster ? MasterHoursScreen : HodinyXScreen}
          options={{
            headerTitle: () => <ApprenticeHeaderTitle />,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Feather name="clock" size={24} color={focused ? "#A855F7" : color} />
              </View>
            ),
          }}
        />
      )}
      {!isAdmin && (
        <Tab.Screen
          name="ProjectsTab"
          component={ProjectsStackNavigator}
          options={{
            headerTitle: () => <ApprenticeHeaderTitle />,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <MaterialCommunityIcons name="folder-multiple" size={24} color={focused ? "#A855F7" : color} />
              </View>
            ),
          }}
        />
      )}
      {!isAdmin && !isGuest && (
        <Tab.Screen
          name="BadgesTab"
          component={isMaster ? MasterBadgesScreen : BadgesScreen}
          options={{
            headerTitle: () => <ApprenticeHeaderTitle />,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Feather name="award" size={24} color={focused ? "#A855F7" : color} />
              </View>
            ),
          }}
        />
      )}
      {!isAdmin && (
        <Tab.Screen
          name="GuildOverviewTab"
          component={GuildOverviewStackNavigator}
          options={{
            headerTitle: () => <ApprenticeHeaderTitle />,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Feather name="users" size={24} color={focused ? "#A855F7" : color} />
              </View>
            ),
          }}
        />
      )}

      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminScreen}
          options={{
            title: "Admin panel",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Feather name="settings" size={24} color={focused ? "#A855F7" : color} />
              </View>
            ),
          }}
        />
      )}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          headerTitle: () => <ApprenticeHeaderTitle />,
          headerLeft: () => null,
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' }, // Ensure it takes 0 space
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.backgroundDefault,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            height: 125,
          },
        }}
      />

    </Tab.Navigator >

  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  activeIconContainer: {
    backgroundColor: "transparent",
  },
});
