import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import { useTheme } from "@/hooks/useTheme";
import { ApprenticeHeaderTitle } from "@/components/ApprenticeHeaderTitle";

const Tab = createBottomTabNavigator();

export default function AuthNavigator() {
  const [isLogin, setIsLogin] = useState(true);
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
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
          paddingBottom: 20,
        },
        headerTitle: () => <ApprenticeHeaderTitle />,
        headerLeft: () => null,
        headerTintColor: theme.text,
        tabBarStyle: { display: 'none' }, // Hide tab bar completely
      }}
    >
      {isLogin ? (
        <Tab.Screen
          name="Login"
          options={{ tabBarButton: () => null }}
        >
          {() => <LoginScreen onSwitchToRegister={() => setIsLogin(false)} />}
        </Tab.Screen>
      ) : (
        <Tab.Screen
          name="Register"
          options={{ tabBarButton: () => null }}
        >
          {() => <RegisterScreen onSwitchToLogin={() => setIsLogin(true)} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
  );
}
