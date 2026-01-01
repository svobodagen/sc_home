import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { api } from "@/services/api";

export interface MasterApprentice {
  apprenticeId: string;
  apprenticeName: string;
  apprenticeEmail: string;
  addedDate: number;
}

interface MasterContextType {
  apprentices: MasterApprentice[];
  addApprentice: (id: string, name: string, email: string) => Promise<void>;
  removeApprentice: (id: string) => Promise<void>;
  isLoading: boolean;
  addApprenticeToMaster: (masterId: string, apprenticeId: string, name: string, email: string) => Promise<void>;
  removeApprenticeFromMaster: (masterId: string, apprenticeId: string) => Promise<void>;
  getMasterApprentices: (masterId: string) => Promise<MasterApprentice[]>;
}

const MasterContext = createContext<MasterContextType | undefined>(undefined);

export function MasterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [apprentices, setApprentices] = useState<MasterApprentice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id && user.role === "Mistr") {
      loadApprentices(user.id);
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadApprentices = async (masterId: string) => {
    try {
      let data = [];
      // VŽDY NEJDŘÍV VOLEJ API
      try {
        const rawData = await api.getApprentices(masterId);
        // TRANSFORMUJ NA SPRÁVNÝ FORMÁT!
        data = rawData.map((a: any) => ({
          apprenticeId: a.apprentice_id,
          apprenticeName: a.apprentice_name,
          apprenticeEmail: a.apprentice_email || "",
          addedDate: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
        }));
      } catch (apiError) {
        console.log("API nedostupné, načítám z AsyncStorage");
        const storageKey = `masterApprentices_${masterId}`;
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          data = JSON.parse(saved);
        }
      }
      setApprentices(data);
      // Ulož i lokálně
      const storageKey = `masterApprentices_${masterId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Chyba při načítání učedníků:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addApprentice = async (id: string, name: string, email: string) => {
    if (!user?.id) return;
    
    try {
      const newApprentice: MasterApprentice = {
        apprenticeId: id,
        apprenticeName: name,
        apprenticeEmail: email,
        addedDate: Date.now(),
      };
      
      try {
        await api.addApprentice(user.id, id, name);
      } catch (apiError) {
        console.log("API unavailable, using local storage");
      }
      
      const updated = [...apprentices, newApprentice];
      setApprentices(updated);
      
      const storageKey = `masterApprentices_${user.id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error("Chyba při přidávání učedníka:", error);
      throw error;
    }
  };

  const removeApprentice = async (id: string) => {
    if (!user?.id) return;
    
    try {
      try {
        await api.removeApprentice(user.id, id);
      } catch (apiError) {
        console.log("API unavailable, using local storage");
      }
      
      const updated = apprentices.filter(a => a.apprenticeId !== id);
      setApprentices(updated);
      
      const storageKey = `masterApprentices_${user.id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error("Chyba při odebírání učedníka:", error);
      throw error;
    }
  };

  const addApprenticeToMaster = async (masterId: string, apprenticeId: string, name: string, email: string) => {
    try {
      // VŽDY NEJDŘÍV ULOŽ DO SUPABASE!
      await api.addApprentice(masterId, apprenticeId, name);
      
      // POTOM ulož do local storage
      const storageKey = `masterApprentices_${masterId}`;
      const saved = await AsyncStorage.getItem(storageKey);
      const existingApprentices = saved ? JSON.parse(saved) : [];

      const newApprentice: MasterApprentice = {
        apprenticeId,
        apprenticeName: name,
        apprenticeEmail: email,
        addedDate: Date.now(),
      };

      const updated = [...existingApprentices, newApprentice];
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

      if (user?.id === masterId) {
        setApprentices(updated);
      }
    } catch (error) {
      console.error("Chyba při přidávání učedníka:", error);
      throw error;
    }
  };

  const removeApprenticeFromMaster = async (masterId: string, apprenticeId: string) => {
    try {
      // VŽDY NEJDŘÍV SMAŽ ZE SUPABASE!
      await api.removeApprentice(masterId, apprenticeId);
      
      // POTOM ze storage
      const storageKey = `masterApprentices_${masterId}`;
      const saved = await AsyncStorage.getItem(storageKey);
      const existingApprentices = saved ? JSON.parse(saved) : [];

      const updated = existingApprentices.filter((a: MasterApprentice) => a.apprenticeId !== apprenticeId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

      if (user?.id === masterId) {
        setApprentices(updated);
      }
    } catch (error) {
      console.error("Chyba při odebírání učedníka:", error);
      throw error;
    }
  };

  const getMasterApprentices = async (masterId: string): Promise<MasterApprentice[]> => {
    try {
      // NEJDŘÍV API! To je cloud, to je truth!
      let data = await api.getApprentices(masterId);
      
      // Transformuj do MasterApprentice formátu
      const apprentices: MasterApprentice[] = data.map((a: any) => ({
        apprenticeId: a.apprentice_id,
        apprenticeName: a.apprentice_name,
        apprenticeEmail: a.apprentice_email || "",
        addedDate: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
      }));
      
      // Ulož do local storage
      const storageKey = `masterApprentices_${masterId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(apprentices));
      
      return apprentices;
    } catch (error) {
      console.error("Chyba při načítání učedníků:", error);
      // Fallback na storage
      try {
        const storageKey = `masterApprentices_${masterId}`;
        const saved = await AsyncStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
  };

  return (
    <MasterContext.Provider value={{ 
      apprentices, 
      addApprentice, 
      removeApprentice, 
      isLoading,
      addApprenticeToMaster,
      removeApprenticeFromMaster,
      getMasterApprentices
    }}>
      {children}
    </MasterContext.Provider>
  );
}

export function useMaster() {
  const context = useContext(MasterContext);
  if (!context) {
    throw new Error("useMaster musí být použit v rámci MasterProvider");
  }
  return context;
}
