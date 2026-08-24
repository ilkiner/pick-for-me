import 'react-native-url-polyfill/auto';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
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
import { consumeRecoveryLink } from './src/core/authLinks';
import { AdManager } from './src/core/AdManager';

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
    // Şifre sıfırlama linkiyle gelindi mi? True ise navigator her şeyin önüne
    // "yeni şifre belirle" ekranını koyar.
    const [recovery, setRecovery] = useState(false);
    const { t, i18n } = useTranslation();
    const { theme, isDark } = useTheme();

    useEffect(() => {
        const initApp = async () => {
            try {
                const savedLang = await AsyncStorage.getItem('appLanguage');
                if (savedLang) {
                    i18n.changeLanguage(savedLang);
                } else {
                    const deviceLang = Localization.getLocales()[0]?.languageCode;
                    i18n.changeLanguage(deviceLang === 'tr' || deviceLang === 'es' ? deviceLang : 'en');
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

            // AdMob SDK'sını burada başlat: eskiden HomeScreen'in useEffect'inde
            // çağrılıyordu, yani banner ile AYNI render'da tetikleniyor ve ilk
            // reklam isteği init bitmeden gidiyordu. Ayrıca giriş ekranında
            // kalan kullanıcıda SDK hiç başlatılmıyordu. Await etmiyoruz —
            // bekleyenler AdManager.subscribeReady ile haberdar oluyor.
            AdManager.init().catch(() => {});

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
                    // Supabase kurtarma oturumu kurulduğunda bu olayı yayar;
                    // derin bağlantı dinleyicisine ek bir emniyet kemeri.
                    if (_event === 'PASSWORD_RECOVERY') setRecovery(true);
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

    // --- Şifre sıfırlama derin bağlantısı ---
    // Mail'deki link uygulamayı pickforme://reset-password#access_token=... ile
    // açar. React Native'de supabase-js bunu kendisi okumaz (detectSessionInUrl
    // web'e özel), token'ı oturuma çevirmek bize düşer.
    // Aynı URL iki kez işlenmemeli: soğuk açılışta getInitialURL ve 'url' olayı
    // çoğu Android cihazda ikisi birden tetikleniyor. Token tek kullanımlık
    // olduğu için ikinci işleme "süresi dolmuş" uyarısı üretirdi.
    const handledUrls = useRef<Set<string>>(new Set());

    const handleDeepLink = useCallback(async (url: string | null) => {
        if (!url || handledUrls.current.has(url)) return;
        handledUrls.current.add(url);

        const outcome = await consumeRecoveryLink(url);

        if (outcome.status === 'ok') {
            track('password_reset_link_opened');
            setRecovery(true);
            return;
        }
        if (outcome.status === 'expired') {
            Alert.alert(t('auth.reset_link_expired_title'), t('auth.reset_link_expired_msg'));
            return;
        }
        if (outcome.status === 'error') {
            Alert.alert(
                t('auth.reset_link_error_title'),
                outcome.message || t('auth.reset_link_error_msg'),
            );
        }
        // 'ignored': şifre sıfırlama linki değil — React Navigation ilgilensin.
    }, [t]);

    useEffect(() => {
        if (!isSupabaseConfigured()) return;
        let cancelled = false;
        const onUrl = (url: string | null) => { if (!cancelled) handleDeepLink(url); };

        // Uygulama kapalıyken linke tıklandıysa başlangıç URL'i burada gelir.
        Linking.getInitialURL().then(onUrl).catch(() => {});
        // Uygulama açıkken tıklandıysa olay olarak gelir.
        const sub = Linking.addEventListener('url', ({ url }) => onUrl(url));

        return () => { cancelled = true; sub.remove(); };
    }, [handleDeepLink]);

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
                    <RootNavigator
                        session={session}
                        recovery={recovery}
                        onRecoveryDone={() => setRecovery(false)}
                    />
                </NavigationContainer>
            </ProProvider>
        </GestureHandlerRootView>
    );
}

function App() {
    return (
        // Insets'i kökten sağla: navigator'lar kendi SafeAreaProviderCompat'ını
        // kurar ama onboarding gibi navigator dışındaki ekranlar açıkta kalıyordu.
        // initialWindowMetrics ilk karede doğru değerle açılmayı sağlar (zıplama yok).
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <ThemeProvider>
                <SoundProvider>
                    <ErrorBoundary>
                        <AppInner />
                    </ErrorBoundary>
                </SoundProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

export default sentryEnabled ? Sentry.wrap(App) : App;
