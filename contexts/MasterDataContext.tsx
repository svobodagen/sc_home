import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { useMaster } from "./MasterContext";

interface MasterDataContextType {
  selectedApprenticeId: string | null;
  setSelectedApprenticeId: (id: string | null) => void;
  apprenticeData: {
    projects: any[];
    workHours: any[];
    certificates: any[];
  } | null;
  apprentices: any[];
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { apprentices } = useMaster();
  const [selectedApprenticeId, setSelectedApprenticeId] = useState<string | null>(null);
  const [apprenticeData, setApprenticeData] = useState<any>(null);

  useEffect(() => {
    if (selectedApprenticeId) {
      loadApprenticeData(selectedApprenticeId);
    }
  }, [selectedApprenticeId]);

  useEffect(() => {
    if (apprentices.length > 0 && !selectedApprenticeId) {
      setSelectedApprenticeId(apprentices[0].apprenticeId);
    }
  }, [apprentices]);

  const loadApprenticeData = async (apprenticeId: string) => {
    try {
      const storageKey = `userData_${apprenticeId}`;
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        setApprenticeData({
          projects: data.projects || [],
          workHours: data.workHours || [],
          certificates: data.certificates || [],
        });
      }
    } catch (error) {
      console.error("Chyba při načítání dat učedníka:", error);
    }
  };

  return (
    <MasterDataContext.Provider value={{ selectedApprenticeId, setSelectedApprenticeId, apprenticeData, apprentices }}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error("useMasterData must be used within MasterDataProvider");
  }
  return context;
}
