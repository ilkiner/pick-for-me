import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundManager from '../core/SoundManager';

const STORAGE_KEY = '@pickforme:soundEnabled';

interface SoundContextValue {
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
}

const SoundContext = createContext<SoundContextValue>({
    soundEnabled: true,
    setSoundEnabled: () => {},
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [soundEnabled, setSoundEnabledState] = useState(true);

    useEffect(() => {
        SoundManager.init().then(() => SoundManager.preload());
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
            if (val === 'false') {
                setSoundEnabledState(false);
                SoundManager.setEnabled(false);
            }
        }).catch(() => {});
    }, []);

    const setSoundEnabled = useCallback((enabled: boolean) => {
        setSoundEnabledState(enabled);
        SoundManager.setEnabled(enabled);
        AsyncStorage.setItem(STORAGE_KEY, String(enabled)).catch(() => {});
    }, []);

    return (
        <SoundContext.Provider value={{ soundEnabled, setSoundEnabled }}>
            {children}
        </SoundContext.Provider>
    );
}

export function useSound(): SoundContextValue {
    return useContext(SoundContext);
}
