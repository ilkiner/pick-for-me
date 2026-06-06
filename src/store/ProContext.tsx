import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

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
}

const ProContext = createContext<ProContextValue>({
    isPro: false,
    isLoading: true,
    offerings: null,
    purchaseMonthly: async () => false,
    purchaseYearly: async () => false,
    restorePurchases: async () => false,
    openPaywall: () => {},
});

interface Props {
    children: React.ReactNode;
    navigationRef: any;
}

export function ProProvider({ children, navigationRef }: Props) {
    const [isPro, setIsPro] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [offerings, setOfferings] = useState<any>(null);

    useEffect(() => {
        (async () => {
            // Restore SecureStore cache — grace period only, not authoritative
            const cached = await readProCache();
            if (cached === true) setIsPro(true);

            if (!Purchases) {
                setIsLoading(false);
                return;
            }
            try {
                const { Platform } = require('react-native');
                const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
                if (!apiKey) {
                    console.warn('[Pro] RevenueCat API key not set. Configure EXPO_PUBLIC_REVENUECAT_KEY_IOS/ANDROID in .env');
                    setIsLoading(false);
                    return;
                }
                await Purchases.configure({ apiKey });

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
        })();
    }, []);

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

    return (
        <ProContext.Provider value={{
            isPro, isLoading, offerings,
            purchaseMonthly, purchaseYearly, restorePurchases, openPaywall,
        }}>
            {children}
        </ProContext.Provider>
    );
}

export function usePro() {
    return useContext(ProContext);
}
