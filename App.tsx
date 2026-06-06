import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator, navigationRef, linking } from './src/navigation';
import { ProProvider } from './src/store/ProContext';
import { SavedListsStorage } from './src/storage/savedLists';
import './src/i18n';
import { isSupabaseConfigured, supabase } from './src/storage/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';

export default function App() {
    const [isReady, setIsReady] = useState(false);
    const [session, setSession] = useState<any>(null);
    const { i18n } = useTranslation();

    useEffect(() => {
        const initApp = async () => {
            // 1. Load language preference
            try {
                const savedLang = await AsyncStorage.getItem('appLanguage');
                if (savedLang) {
                    i18n.changeLanguage(savedLang);
                } else {
                    const deviceLang = Localization.getLocales()[0]?.languageCode;
                    i18n.changeLanguage(deviceLang === 'tr' ? 'tr' : 'en');
                }
            } catch (e) {
                console.error('Error loading language', e);
            }

            // 2. Load session (demo mode when Supabase not configured)
            if (!isSupabaseConfigured()) {
                console.warn('Supabase not configured. Running in demo mode.');
                setSession({ user: { id: 'demo', email: 'demo@pickforme.app' } });
                setIsReady(true);
                return;
            }

            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
                setIsReady(true);

                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, newSession: any) => {
                    setSession(newSession);
                    // Pull cloud lists on sign-in (new device sync)
                    if (_event === 'SIGNED_IN' && newSession) {
                        SavedListsStorage.syncWithCloud().catch(() => {});
                    }
                });

                return () => {
                    subscription.unsubscribe();
                };
            } catch (e) {
                console.error('Supabase session error:', e);
                setIsReady(true);
            }
        };

        initApp();
    }, []);

    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1E' }}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ProProvider navigationRef={navigationRef}>
                <StatusBar style="auto" />
                <NavigationContainer ref={navigationRef} linking={linking}>
                    <RootNavigator session={session} />
                </NavigationContainer>
            </ProProvider>
        </GestureHandlerRootView>
    );
}
