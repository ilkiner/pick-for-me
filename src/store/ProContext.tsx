import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// RevenueCat — graceful fallback when native module not available (Expo Go / simulator)
let Purchases: any = null;
try {
    Purchases = require('react-native-purchases').default;
} catch {
    // native module not linked — dev-build required
}

// ─── Product IDs (must match App Store Connect / Play Console) ────────────────
export const RC_API_KEY_IOS = 'REVENUECAT_IOS_KEY_HERE';
export const RC_API_KEY_ANDROID = 'REVENUECAT_ANDROID_KEY_HERE';
export const PRODUCT_MONTHLY = 'pickforme_monthly_199';
export const PRODUCT_YEARLY = 'pickforme_yearly_799';
export const ENTITLEMENT_PRO = 'pro';

// ─── Free-tier limits ─────────────────────────────────────────────────────────
export const FREE_LIST_LIMIT = 3;
export const FREE_ITEM_LIMIT = 20;

const STORAGE_KEY = '@pro_status_v1';

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
            // Restore cached status immediately so UI doesn't flash
            const cached = await AsyncStorage.getItem(STORAGE_KEY);
            if (cached === 'true') setIsPro(true);

            if (!Purchases) {
                setIsLoading(false);
                return;
            }
            try {
                const { Platform } = require('react-native');
                const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
                await Purchases.configure({ apiKey });

                const info = await Purchases.getCustomerInfo();
                const active = info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
                setIsPro(active);
                await AsyncStorage.setItem(STORAGE_KEY, active ? 'true' : 'false');

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
            await AsyncStorage.setItem(STORAGE_KEY, active ? 'true' : 'false');
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
            await AsyncStorage.setItem(STORAGE_KEY, active ? 'true' : 'false');
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
