import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    theme: typeof Colors.light;
    isDark: boolean;
}

// Default values to prevent crashes if used outside provider
const ThemeContext = createContext<ThemeContextType>({
    themeMode: 'system',
    setThemeMode: () => { },
    theme: Colors.light,
    isDark: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useSystemColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const storedTheme = await AsyncStorage.getItem('user_theme_preference');
            if (storedTheme) {
                setThemeModeState(storedTheme as ThemeMode);
            }
        } catch (e) {
            console.error('Failed to load theme preference', e);
        } finally {
            setLoaded(true);
        }
    };

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem('user_theme_preference', mode);
        } catch (e) {
            console.error('Failed to save theme preference', e);
        }
    };

    // Resolve effective color scheme
    const activeColorScheme = themeMode === 'system'
        ? (systemColorScheme ?? 'light')
        : themeMode;

    // Map to 'light' | 'dark' keys strictly
    const resolvedScheme = activeColorScheme === 'dark' ? 'dark' : 'light';

    const theme = Colors[resolvedScheme];
    const isDark = resolvedScheme === 'dark';

    if (!loaded) {
        // Return null or partial app until theme is loaded to prevent flash? 
        // For now, render children with default (system/light) while loading async storage is fast enough usually.
        // But maybe we render nothing to avoid flash of wrong theme?
        // Let's render children.
    }

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, theme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => useContext(ThemeContext);
