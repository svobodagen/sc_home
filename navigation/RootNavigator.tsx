import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "./MainTabNavigator";
import ProfileScreen from "@/screens/ProfileScreen";
import ProjectDetailScreen from "@/screens/ProjectDetailScreen";
import ApprenticeDetailScreen from "@/screens/ApprenticeDetailScreen";
import HostApprenticeDetailScreen from "@/screens/HostApprenticeDetailScreen";
import HostMasterDetailScreen from "@/screens/HostMasterDetailScreen";
import AuthNavigator from "./AuthNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Spacing } from "@/constants/theme";
import { Project } from "@/contexts/DataContext";
import { ApprenticeHeaderTitle } from "@/components/ApprenticeHeaderTitle";

import HostDashboardScreen from "@/screens/HostDashboardScreen";

export type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
  ProjectDetail: { project: Project; projectIndex: number; isGlobal?: boolean };
  ApprenticeDetail: { apprenticeId: string; apprenticeName: string };
  HostApprenticeDetail: { apprenticeId: string; apprenticeName: string };
  HostMasterDetail: { masterId: string; masterName: string };
  GuildOverview: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.backgroundRoot },
      }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen
        name="GuildOverview"
        component={HostDashboardScreen}
        options={{
          headerShown: true,
          headerTitle: () => <ApprenticeHeaderTitle />,
          headerStyle: {
            backgroundColor: theme.backgroundDefault,
          },
          headerTintColor: theme.text,
        }}
      />

    </Stack.Navigator>
  );
}
