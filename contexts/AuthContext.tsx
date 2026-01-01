import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";

export type UserRole = "Mistr" | "Učedník" | "Host" | "Admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  timestamp: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  getAllUsers: () => Promise<any[]>;
  deleteUser: (userId: string) => Promise<void>;
  resetUserData: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("@svobodne_cechy_user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Failed to load user", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    const user = await api.register(email, password, name, role);
    await AsyncStorage.setItem("@svobodne_cechy_user", JSON.stringify(user));
    setUser(user);
    
    if (role === "Učedník") {
      try {
        await api.createUserHourLimits(user.id);
      } catch (error) {
        console.error("Chyba při vytváření limitů hodin:", error);
      }
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    await AsyncStorage.setItem("@svobodne_cechy_user", JSON.stringify(response));
    setUser(response);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("@svobodne_cechy_user");
      setUser(null);
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  const getAllUsers = async () => {
    try {
      // Stažení uživatelů z cloudu (PostgreSQL)
      return await api.getUsers();
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Smaž v cloudu (PostgreSQL)
      await api.deleteUser(userId);
    } catch (error) {
      console.error("Chyba při mazání uživatele:", error);
      throw error;
    }
  };

  const resetUserData = async (userId: string) => {
    try {
      // Reset v cloudu (PostgreSQL)
      const result = await api.resetUserData(userId);
      return result;
    } catch (error) {
      console.error("Chyba při resetování dat uživatele:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, getAllUsers, deleteUser, resetUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
