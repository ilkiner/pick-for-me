import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { isSupabaseConfigured, supabase } from '../storage/supabase';

// RevenueCat — graceful fallback when native module not available (Expo Go / simulator)
let Purchases: any = null;
try {
    Purchases = require('react-native-purchases').default;
} catch {
    // native module not linked — dev-build required
}

// ─── Product IDs (must match App Store Connect / Play Console) ────────────────
// Set EXPO_PUBLIC_REVENUECAT_KEY_IOS / _ANDROID in .env
export const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_KEY_IOS ?? '';
export const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_KEY_ANDROID ?? '';
export const PRODUCT_MONTHLY = 'pickforme_monthly_199';
export const PRODUCT_YEARLY = 'pickforme_yearly_799';
export const ENTITLEMENT_PRO = 'pro';

// ─── Free-tier limits ─────────────────────────────────────────────────────────
export const FREE_LIST_LIMIT = 3;
export const FREE_ITEM_LIMIT = 20;

// ─── Activity history retention ───────────────────────────────────────────────
export const HISTORY_RETENTION_FREE_MS = 48 * 60 * 60 * 1000;       // 48 hours
export const HISTORY_RETENTION_PRO_MS = 10 * 24 * 60 * 60 * 1000;   // 10 days
export const HISTORY_MAX_ITEMS = 500;                                // safety cap

// Cache stored in SecureStore — tamper-resistant on rooted/jailbroken devices.
// Structure: JSON { value: boolean, ts: number } — expires after 24 h
const CACHE_KEY = 'pro_status_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function readProCache(): Promise<boolean | null> {
    try {
        const raw = await SecureStore.getItemAsync(CACHE_KEY);
        if (!raw) return null;
        const { value, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) return null; // expired
        return value === true;
    } catch {
        return null;
    }
}

async function writeProCache(value: boolean): Promise<void> {
    try {
        await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify({ value, ts: Date.now() }));
    } catch (e) {
        console.warn('[Pro] SecureStore write failed:', e);
    }
}

interface ProContextValue {
    isPro: boolean;
    isLoading: boolean;
    offerings: any;
    purchaseMonthly: () => Promise<boolean>;
    purchaseYearly: () => Promise<boolean>;
    restorePurchases: () => Promise<boolean>;
    openPaywall: () => void;
    /** Dev-only: forced Pro state for testing. null = real RevenueCat state */
    devProOverride: boolean | null;
    /** Dev-only: cycle free → pro → real state. No-op in production builds. */
    devTogglePro: () => void;
}

const ProContext = createContext<ProContextValue>({
    isPro: false,
    isLoading: true,
    offerings: null,
    purchaseMonthly: async () => false,
    purchaseYearly: async () => false,
    restorePurchases: async () => false,
    openPaywall: () => {},
    devProOverride: null,
    devTogglePro: () => {},
});

interface Props {
    children: React.ReactNode;
    navigationRef: any;
}

export function ProProvider({ children, navigationRef }: Props) {
    const [isPro, setIsPro] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [offerings, setOfferings] = useState<any>(null);
    const [devProOverride, setDevProOverride] = useState<boolean | null>(null);

    // RevenueCat'in şu an bağlı olduğu Supabase kullanıcısı. Token yenileme gibi
    // olaylarda aynı kimlik için tekrar tekrar logIn çağırmamak için tutuluyor.
    const linkedUserIdRef = useRef<string | null>(null);

    // Dev-only: cycle Free → Pro → real state for testing both tiers
    const devTogglePro = useCallback(() => {
        if (!__DEV__) return;
        setDevProOverride(prev => (prev === null ? true : prev === true ? false : null));
    }, []);

    // RevenueCat kimliğini Supabase kullanıcısına bağlar (userId null → logOut).
    // Böylece RevenueCat panelinden belirli bir kullanıcıya promotional
    // entitlement tanımlanabiliyor. Yalnızca configure() başarılı olduktan sonra
    // çağrılmalı; yapılandırılmamış SDK'da logIn/logOut hata verir.
    const linkRevenueCatIdentity = useCallback(async (userId: string | null) => {
        if (!Purchases) return;
        if (linkedUserIdRef.current === userId) return;

        try {
            const customerInfo = userId
                ? (await Purchases.logIn(userId)).customerInfo
                : await Purchases.logOut();

            linkedUserIdRef.current = userId;

            // Kimlik değişince entitlement'lar da değişebilir (ör. o kullanıcıya
            // tanımlanmış promotional entitlement) — Pro durumunu tazele.
            const active = customerInfo?.entitlements?.active?.[ENTITLEMENT_PRO] !== undefined;
            setIsPro(active);
            await writeProCache(active);
        } catch (e) {
            console.warn('[Pro] RevenueCat identity link failed:', e);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        let unsubscribeAuth: (() => void) | undefined;

        (async () => {
            // Restore SecureStore cache — grace period only, not authoritative
            const cached = await readProCache();
            if (cached === true) setIsPro(true);

            if (!Purchases) {
                setIsLoading(false);
                return;
            }
            let configured = false;
            try {
                const { Platform } = require('react-native');
                const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
                if (!apiKey) {
                    console.warn('[Pro] RevenueCat API key not set. Configure EXPO_PUBLIC_REVENUECAT_KEY_IOS/ANDROID in .env');
                    setIsLoading(false);
                    return;
                }
                await Purchases.configure({ apiKey });
                configured = true;

                const info = await Purchases.getCustomerInfo();
                const active = info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
                setIsPro(active);
                await writeProCache(active);

                const off = await Purchases.getOfferings();
                setOfferings(off.current);
            } catch (e) {
                console.warn('[Pro] RevenueCat init failed:', e);
            } finally {
                setIsLoading(false);
            }

            // Kimlik bağlama configure() sonrasına ait; isLoading'i bekletmemesi
            // için ayrı tutuldu. Demo modda (Supabase yapılandırılmamış)
            // bağlanacak bir kullanıcı yok.
            if (!configured || cancelled || !isSupabaseConfigured()) return;

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) await linkRevenueCatIdentity(session.user.id);

                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    (event: string, newSession: any) => {
                        if (event === 'SIGNED_OUT') {
                            linkRevenueCatIdentity(null);
                        } else if (newSession?.user?.id) {
                            linkRevenueCatIdentity(newSession.user.id);
                        }
                    }
                );

                // Effect bu iş bitmeden söküldüyse aboneliği hemen bırak.
                if (cancelled) subscription.unsubscribe();
                else unsubscribeAuth = () => subscription.unsubscribe();
            } catch (e) {
                console.warn('[Pro] RevenueCat auth link failed:', e);
            }
        })();

        return () => {
            cancelled = true;
            unsubscribeAuth?.();
        };
    }, [linkRevenueCatIdentity]);

    const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
        if (!Purchases) {
            console.warn('[Pro] react-native-purchases not linked. Build with EAS.');
            return false;
        }
        try {
            const products = await Purchases.getProducts([productId]);
            if (!products.length) return false;
            const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
            const active = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
            setIsPro(active);
            await writeProCache(active);
            return active;
        } catch (e: any) {
            if (!e.userCancelled) console.warn('[Pro] Purchase failed:', e);
            return false;
        }
    }, []);

    const purchaseMonthly = useCallback(() => purchaseProduct(PRODUCT_MONTHLY), [purchaseProduct]);
    const purchaseYearly = useCallback(() => purchaseProduct(PRODUCT_YEARLY), [purchaseProduct]);

    const restorePurchases = useCallback(async (): Promise<boolean> => {
        if (!Purchases) return false;
        try {
            const info = await Purchases.restorePurchases();
            const active = info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
            setIsPro(active);
            await writeProCache(active);
            return active;
        } catch (e) {
            console.warn('[Pro] Restore failed:', e);
            return false;
        }
    }, []);

    const openPaywall = useCallback(() => {
        if (navigationRef?.current?.isReady()) {
            navigationRef.current.navigate('Paywall');
        }
    }, [navigationRef]);

    const effectiveIsPro = __DEV__ && devProOverride !== null ? devProOverride : isPro;

    return (
        <ProContext.Provider value={{
            isPro: effectiveIsPro, isLoading, offerings,
            purchaseMonthly, purchaseYearly, restorePurchases, openPaywall,
            devProOverride, devTogglePro,
        }}>
            {children}
        </ProContext.Provider>
    );
}

export function usePro() {
    return useContext(ProContext);
}
