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
// Replace with real IDs when going to production.
// These are Google's universal test IDs — safe during development.
import { Platform } from 'react-native';

export const AD_UNITS = {
    banner: Platform.select({
        ios: 'ca-app-pub-3940256099942544/2934735716',
        android: 'ca-app-pub-3940256099942544/6300978111',
        default: 'ca-app-pub-3940256099942544/6300978111',
    }) as string,
    interstitial: Platform.select({
        ios: 'ca-app-pub-3940256099942544/4411468910',
        android: 'ca-app-pub-3940256099942544/1033173712',
        default: 'ca-app-pub-3940256099942544/1033173712',
    }) as string,
    rewarded: Platform.select({
        ios: 'ca-app-pub-3940256099942544/1712485313',
        android: 'ca-app-pub-3940256099942544/5224354917',
        default: 'ca-app-pub-3940256099942544/5224354917',
    }) as string,
};

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
        try {
            this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
            this.interstitialAd.load();
        } catch {}
    }

    private loadRewarded() {
        if (!RewardedAd) return;
        try {
            this.rewardedAd = RewardedAd.createForAdRequest(AD_UNITS.rewarded);
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
