import React, { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isLogin ? (
        <Stack.Screen
          name="Login"
          options={{ animationTypeForReplace: "pop" }}
        >
          {() => <LoginScreen onSwitchToRegister={() => setIsLogin(false)} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen
          name="Register"
          options={{ animationTypeForReplace: "pop" }}
        >
          {() => <RegisterScreen onSwitchToLogin={() => setIsLogin(true)} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
