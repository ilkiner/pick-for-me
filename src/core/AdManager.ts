// AdMob wrapper — graceful fallback when native module not available (Expo Go)
let MobileAds: any = null;
let RewardedAd: any = null;
let InterstitialAd: any = null;
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;

try {
    const lib = require('react-native-google-mobile-ads');
    MobileAds = lib.default;
    RewardedAd = lib.RewardedAd;
    InterstitialAd = lib.InterstitialAd;
    BannerAd = lib.BannerAd;
    BannerAdSize = lib.BannerAdSize;
    TestIds = lib.TestIds;
    AdEventType = lib.AdEventType;
    RewardedAdEventType = lib.RewardedAdEventType;
} catch {
    // native module not linked
}

export { BannerAd, BannerAdSize, TestIds };

// ─── Ad Unit IDs ─────────────────────────────────────────────────────────────
// __DEV__ → Google'ın evrensel test ID'leri (her zaman güvenli).
// Production → env'den okunur; eksikse reklam GÖSTERİLMEZ + console.warn.
// Not: EXPO_PUBLIC_* erişimleri Metro tarafından build sırasında statik olarak
// gömüldüğü için tam üye ifadesi olarak (dinamik key'siz) yazılmalıdır.
import { Platform } from 'react-native';

export type AdUnitKind = 'banner' | 'interstitial' | 'rewarded';

// Google'ın resmi test reklam birimleri (TestIds ile aynı değerler; native
// modül yokken de — Expo Go — sabit kalsın diye literal tutuluyor)
const TEST_UNITS: Record<AdUnitKind, string> = {
    banner: Platform.select({
        ios: 'ca-app-pub-3940256099942544/2934735716',
        default: 'ca-app-pub-3940256099942544/6300978111',
    }) as string,
    interstitial: Platform.select({
        ios: 'ca-app-pub-3940256099942544/4411468910',
        default: 'ca-app-pub-3940256099942544/1033173712',
    }) as string,
    rewarded: Platform.select({
        ios: 'ca-app-pub-3940256099942544/1712485313',
        default: 'ca-app-pub-3940256099942544/5224354917',
    }) as string,
};

const ENV_UNITS: Record<AdUnitKind, string | undefined> = {
    banner: Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
        default: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    }),
    interstitial: Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
        default: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    }),
    rewarded: Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
        default: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
    }),
};

const warned = new Set<AdUnitKind>();

/** Kullanılacak reklam birimi ID'si; production'da env eksikse null (reklam yok). */
export function getAdUnit(kind: AdUnitKind): string | null {
    if (__DEV__) return TEST_UNITS[kind];
    const id = ENV_UNITS[kind]?.trim();
    if (!id) {
        if (!warned.has(kind)) {
            warned.add(kind);
            console.warn(
                `[Ads] Missing production ad unit ID for "${kind}" — ad disabled. ` +
                `Set EXPO_PUBLIC_ADMOB_${kind.toUpperCase()}_ANDROID / _IOS in the build environment.`
            );
        }
        return null;
    }
    return id;
}

// Minimum gap between interstitials (milliseconds)
const INTERSTITIAL_GAP_MS = 4 * 60 * 1000; // 4 minutes

class AdManagerClass {
    private initialized = false;
    private lastInterstitialTime = 0;
    private interstitialAd: any = null;
    private rewardedAd: any = null;

    async init() {
        if (this.initialized || !MobileAds) return;
        try {
            await MobileAds().initialize();
            this.initialized = true;
            this.loadInterstitial();
            this.loadRewarded();
        } catch (e) {
            console.warn('[Ads] init failed:', e);
        }
    }

    private loadInterstitial() {
        if (!InterstitialAd) return;
        const unitId = getAdUnit('interstitial');
        if (!unitId) return;
        try {
            this.interstitialAd = InterstitialAd.createForAdRequest(unitId);
            this.interstitialAd.load();
        } catch {}
    }

    private loadRewarded() {
        if (!RewardedAd) return;
        const unitId = getAdUnit('rewarded');
        if (!unitId) return;
        try {
            this.rewardedAd = RewardedAd.createForAdRequest(unitId);
            this.rewardedAd.load();
        } catch {}
    }

    /**
     * Show an interstitial ad with frequency cap.
     * @param isPro Skip if user is Pro
     */
    showInterstitial(isPro: boolean): boolean {
        if (isPro || !this.interstitialAd) return false;
        const now = Date.now();
        if (now - this.lastInterstitialTime < INTERSTITIAL_GAP_MS) return false;
        try {
            if (this.interstitialAd.loaded) {
                this.interstitialAd.show();
                this.lastInterstitialTime = now;
                // Pre-load next ad
                setTimeout(() => this.loadInterstitial(), 1000);
                return true;
            }
        } catch (e) {
            console.warn('[Ads] interstitial show failed:', e);
        }
        return false;
    }

    /**
     * Show a rewarded video. Calls `onRewarded` if the user earns the reward.
     * @param isPro Skip if user is Pro
     */
    showRewarded(isPro: boolean, onRewarded: () => void, onDismiss?: () => void): boolean {
        if (isPro || !this.rewardedAd) {
            // If native not available, just grant reward (dev/testing convenience)
            if (!RewardedAd) {
                onRewarded();
            }
            return false;
        }
        try {
            if (!this.rewardedAd.loaded) return false;

            const unsubEarned = this.rewardedAd.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                () => {
                    onRewarded();
                    unsubEarned();
                }
            );
            const unsubClose = this.rewardedAd.addAdEventListener(
                AdEventType.CLOSED,
                () => {
                    onDismiss?.();
                    unsubClose();
                    setTimeout(() => this.loadRewarded(), 500);
                }
            );

            this.rewardedAd.show();
            return true;
        } catch (e) {
            console.warn('[Ads] rewarded show failed:', e);
            return false;
        }
    }

    get isAvailable() {
        return !!MobileAds;
    }
}

export const AdManager = new AdManagerClass();
