import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { isSupabaseConfigured, supabase } from '../storage/supabase';
import { AdManager } from '../core/AdManager';

// RevenueCat — graceful fallback when native module not available (Expo Go / simulator)
let Purchases: any = null;
try {
    Purchases = require('react-native-purchases').default;
} catch {
    // native module not linked — dev-build required
}

// ─── RevenueCat yapılandırması ────────────────────────────────────────────────
// Set EXPO_PUBLIC_REVENUECAT_KEY_IOS / _ANDROID in .env
export const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_KEY_IOS ?? '';
export const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_KEY_ANDROID ?? '';
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

function hasPro(info: any): boolean {
    return info?.entitlements?.active?.[ENTITLEMENT_PRO] !== undefined;
}

interface ProContextValue {
    isPro: boolean;
    isLoading: boolean;
    offerings: any;
    /**
     * Offering'den gelen paketi satın alır. Ham ürün kimliğiyle satın alma
     * yapılmaz: paket üzerinden gidildiğinde Play/App Store'daki doğru teklif
     * (ör. ücretsiz deneme) seçilir ve satın alma RevenueCat'te doğru
     * offering'e atfedilir.
     */
    purchasePackage: (pkg: any) => Promise<boolean>;
    /** Offering'leri yeniden çeker. Paywall'daki "tekrar dene" için. */
    refreshOfferings: () => Promise<void>;
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
    purchasePackage: async () => false,
    refreshOfferings: async () => {},
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

    // Kimlik değişimleri sıraya girer: hızlı giriş→çıkış'ta iki logIn/logOut iç içe
    // geçerse linkedUserIdRef ile SDK'nın gerçek kimliği ayrışırdı.
    const identityQueueRef = useRef<Promise<void>>(Promise.resolve());

    // RevenueCat kimliğini Supabase kullanıcısına bağlar (userId null → misafir).
    // Böylece RevenueCat panelinden belirli bir kullanıcıya promotional
    // entitlement tanımlanabiliyor. Yalnızca configure() başarılı olduktan sonra
    // çağrılmalı; yapılandırılmamış SDK'da logIn/logOut hata verir.
    //
    // Misafir = anonim RevenueCat kimliği: satın alma ve restore giriş olmadan
    // çalışır, sonradan girişte entitlement hesaba taşınır (aşağıda).
    const linkRevenueCatIdentity = useCallback((userId: string | null): Promise<void> => {
        if (!Purchases) return Promise.resolve();

        const run = async () => {
            if (linkedUserIdRef.current === userId) return;

            try {
                let customerInfo: any;

                if (userId) {
                    // Misafirken Pro alındıysa abonelik anonim kimliğe bağlı.
                    // logIn'den ÖNCE soruyoruz; sonra anonim kimlik artık "mevcut" değil.
                    const wasAnonymous = linkedUserIdRef.current === null;
                    const guestHadPro = wasAnonymous
                        ? hasPro(await Purchases.getCustomerInfo())
                        : false;

                    ({ customerInfo } = await Purchases.logIn(userId));

                    // logIn yalnızca kimliği değiştirir. Hesap RevenueCat'te ilk
                    // kez görülüyorsa anonim geçmiş ona geçer; hesap DAHA ÖNCE
                    // var olduğunda geçmeyebilir. İkinci durumda misafir Pro'su
                    // sessizce kaybolurdu — restore, aboneliği mağaza makbuzundan
                    // bulup (RevenueCat "restore behavior": transfer) hesaba bağlar.
                    if (guestHadPro && !hasPro(customerInfo)) {
                        customerInfo = await Purchases.restorePurchases();
                    }
                } else {
                    customerInfo = await Purchases.logOut();
                }

                linkedUserIdRef.current = userId;

                // Kimlik değişince entitlement'lar da değişebilir (ör. o kullanıcıya
                // tanımlanmış promotional entitlement; çıkışta da misafir = ücretsiz)
                // — Pro durumunu tazele.
                const active = hasPro(customerInfo);
                setIsPro(active);
                await writeProCache(active);
            } catch (e) {
                console.warn('[Pro] RevenueCat identity link failed:', e);
            }
        };

        identityQueueRef.current = identityQueueRef.current.then(run, run);
        return identityQueueRef.current;
    }, []);

    // Offering çekilemezse offerings null bırakılır — paywall bu durumda fiyat
    // uydurmak yerine hata gösterip bu fonksiyonla tekrar denenmesini sağlar.
    const refreshOfferings = useCallback(async (): Promise<void> => {
        if (!Purchases) return;
        try {
            const off = await Purchases.getOfferings();
            setOfferings(off?.current ?? null);
        } catch (e) {
            console.warn('[Pro] Offerings fetch failed:', e);
            setOfferings(null);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        let unsubscribeAuth: (() => void) | undefined;
        let removeInfoListener: (() => void) | undefined;

        // Abonelik durumu uygulama açıkken de değişebilir: yenileme, iptal, iade,
        // başka cihazda yapılan satın alma veya RevenueCat panelinden verilen
        // promotional entitlement. Bu dinleyici olmadan değişiklik ancak
        // yeniden başlatmada görünürdü.
        const onCustomerInfoUpdate = (info: any) => {
            const active = info?.entitlements?.active?.[ENTITLEMENT_PRO] !== undefined;
            setIsPro(active);
            writeProCache(active).catch(() => {});
        };

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

                // configure() sonrasına ait: yapılandırılmamış SDK'da dinleyici
                // eklenemez. getCustomerInfo'dan önce bağlanıyor ki arada gelen
                // güncelleme kaçmasın.
                Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdate);
                if (cancelled) Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdate);
                else removeInfoListener = () => Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdate);

                const info = await Purchases.getCustomerInfo();
                const active = info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
                setIsPro(active);
                await writeProCache(active);

                // Kendi hatasını yutar: offering çekilememesi Pro durumunu ya da
                // kimlik bağlamayı düşürmemeli.
                await refreshOfferings();
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
                // RevenueCat kimliği yeniden başlatmalar arasında kalıcı: SDK'nın
                // gerçekte kim olduğunu sorup ref'i ona göre kuruyoruz. Böylece
                // oturum yokken (misafir) kalmış eski bir hesap kimliği aşağıda
                // logOut ile temizlenir, anonim kimlikte gereksiz logOut da çağrılmaz.
                try {
                    const anonymous = await Purchases.isAnonymous();
                    linkedUserIdRef.current = anonymous ? null : await Purchases.getAppUserID();
                } catch (e) {
                    console.warn('[Pro] RevenueCat identity read failed:', e);
                }

                const { data: { session } } = await supabase.auth.getSession();
                await linkRevenueCatIdentity(session?.user?.id ?? null);

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
            removeInfoListener?.();
            unsubscribeAuth?.();
        };
    }, [linkRevenueCatIdentity, refreshOfferings]);

    const purchasePackage = useCallback(async (pkg: any): Promise<boolean> => {
        if (!Purchases) {
            console.warn('[Pro] react-native-purchases not linked. Build with EAS.');
            return false;
        }
        if (!pkg) {
            console.warn('[Pro] purchasePackage called without a package — offerings not loaded?');
            return false;
        }
        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            const active = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
            setIsPro(active);
            await writeProCache(active);
            return active;
        } catch (e: any) {
            if (!e.userCancelled) console.warn('[Pro] Purchase failed:', e);
            return false;
        }
    }, []);

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

    // Pro kullanıcı için interstitial hiç yüklenmesin (yalnızca gösterilmemesi
    // yetmiyor: boşa istek atmak AdMob eşleşme oranını düşürür).
    useEffect(() => { AdManager.setPro(effectiveIsPro); }, [effectiveIsPro]);

    return (
        <ProContext.Provider value={{
            isPro: effectiveIsPro, isLoading, offerings,
            purchasePackage, refreshOfferings, restorePurchases, openPaywall,
            devProOverride, devTogglePro,
        }}>
            {children}
        </ProContext.Provider>
    );
}

export function usePro() {
    return useContext(ProContext);
}
