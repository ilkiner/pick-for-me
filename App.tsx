import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation';
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
                    if (deviceLang === 'tr') {
                        i18n.changeLanguage('tr');
                    } else {
                        i18n.changeLanguage('en');
                    }
                }
            } catch (e) {
                console.error('Error loading language', e);
            }

            // 2. Load Session (only if Supabase is properly configured)
            if (!isSupabaseConfigured()) {
                // Demo mode: skip auth, go straight to the app
                console.warn('Supabase is not configured. Running in demo mode (no auth).');
                setSession({ user: { id: 'demo', email: 'demo@pickforme.app' } });
                setIsReady(true);
                return;
            }

            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
                setIsReady(true);

                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
                    setSession(newSession);
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="auto" />
            <NavigationContainer>
                <RootNavigator session={session} />
            </NavigationContainer>
        </>
    );
}
