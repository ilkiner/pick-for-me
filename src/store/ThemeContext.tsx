import React, {
    createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, darkTheme, lightTheme } from '../core/Theme';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
    theme: AppTheme;
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    isDark: boolean;
}

const STORAGE_KEY = '@pickforme:themeMode';

const ThemeContext = createContext<ThemeContextValue>({
    theme: darkTheme,
    mode: 'system',
    setMode: () => {},
    isDark: true,
});

function resolveTheme(mode: ThemeMode, systemScheme: ColorSchemeName): AppTheme {
    if (mode === 'light') return lightTheme;
    if (mode === 'dark') return darkTheme;
    return systemScheme === 'light' ? lightTheme : darkTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
        Appearance.getColorScheme()
    );

    // Load saved mode on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(saved => {
            if (saved === 'dark' || saved === 'light' || saved === 'system') {
                setModeState(saved);
            }
        }).catch(() => {});
    }, []);

    // Listen for system scheme changes
    useEffect(() => {
        const sub = Appearance.addChangeListener(({ colorScheme }) => {
            setSystemScheme(colorScheme);
        });
        return () => sub.remove();
    }, []);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    }, []);

    const theme = resolveTheme(mode, systemScheme);
    const isDark = theme === darkTheme;

    return (
        <ThemeContext.Provider value={{ theme, mode, setMode, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}
