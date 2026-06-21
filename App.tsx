import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { RootNavigator, navigationRef, linking } from './src/navigation';
import { ProProvider } from './src/store/ProContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import { SoundProvider } from './src/store/SoundContext';
import { SavedListsStorage } from './src/storage/savedLists';
import './src/i18n';
import { isSupabaseConfigured, supabase } from './src/storage/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/main/OnboardingScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initAnalytics, track } from './src/core/Analytics';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryEnabled = Boolean(SENTRY_DSN);

if (sentryEnabled) {
    Sentry.init({
        dsn: SENTRY_DSN!,
        environment: __DEV__ ? 'development' : 'production',
        tracesSampleRate: __DEV__ ? 0 : 0.2,
    });
}

function AppInner() {
    const [isReady, setIsReady] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [onboardingDone, setOnboardingDone] = useState(false);
    const { i18n } = useTranslation();
    const { theme, isDark } = useTheme();

    useEffect(() => {
        const initApp = async () => {
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

            try {
                const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
                if (seen) setOnboardingDone(true);
            } catch {}

            initAnalytics();
            track('app_opened');

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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!onboardingDone) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <OnboardingScreen onDone={() => setOnboardingDone(true)} />
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ProProvider navigationRef={navigationRef}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <NavigationContainer ref={navigationRef} linking={linking}>
                    <RootNavigator session={session} />
                </NavigationContainer>
            </ProProvider>
        </GestureHandlerRootView>
    );
}

function App() {
    return (
        <ThemeProvider>
            <SoundProvider>
                <ErrorBoundary>
                    <AppInner />
                </ErrorBoundary>
            </SoundProvider>
        </ThemeProvider>
    );
}

export default sentryEnabled ? Sentry.wrap(App) : App;
