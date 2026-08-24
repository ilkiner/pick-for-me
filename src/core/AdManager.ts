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
import * as Sentry from '@sentry/react-native';
import { track } from './Analytics';

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

// ─── Test cihazları ──────────────────────────────────────────────────────────
// Dahili test / preview build'lerinde `__DEV__` false olduğu için GERÇEK reklam
// birimleri kullanılıyor. Kendi cihazında oluşan gösterim ve tıklamalar AdMob
// tarafından geçersiz trafik sayılabilir ve hesabı riske atar.
//
// Çözüm test ID'sine geçmek DEĞİL: Google, gerçek birimlerle test reklamı
// sunulmasını istiyor — böylece üretimdeki birim yapılandırmasını (fill,
// boyut, aracı ağlar) birebir doğrulamış oluyorsun.
//
// Anahtar EAS'te YALNIZCA preview/development ortamında tanımlanır; production
// ortamında tanımsız kalır ve gerçek reklamlar döner. Cihaz ID'si uygulama ilk
// reklam isteğini attığında logcat/Xcode konsoluna basılır:
//   "Use RequestConfiguration.Builder.setTestDeviceIds(Arrays.asList("33BE..."))"
// Birden fazla cihaz virgülle ayrılır.
const TEST_DEVICE_IDS: string[] = String(process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

/** Bu build test reklamı mı gösteriyor (dev ya da kayıtlı test cihazı)? */
export function isTestAdMode(): boolean {
    return __DEV__ || TEST_DEVICE_IDS.length > 0;
}

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

// ─── Teşhis ──────────────────────────────────────────────────────────────────
// Reklam hataları eskiden boş catch'lerde kayboluyordu: üretimde reklamların
// neden çıkmadığını görmenin hiçbir yolu yoktu. Artık her hata analytics'e
// gidiyor; Sentry'ye ise oturum başına (yer, hata kodu) çifti başına BİR kez
// düşüyor — no-fill normal bir durum ve her seferinde raporlanırsa kotayı
// doldurur, ama oturumda bir kez görmek fill sorununu teşhis etmeye yeter.
const reportedIssues = new Set<string>();

function adErrorCode(error: any): string {
    const raw = error?.code ?? error?.message ?? 'unknown';
    // 'googleMobileAds/error-code-no-fill' → 'error-code-no-fill'
    return String(raw).replace(/^googleMobileAds\//, '').slice(0, 80);
}

/** Reklam hatasını logla, analytics'e yaz ve (bir kez) Sentry'ye ilet. */
export function reportAdIssue(placement: string, error: any, extra?: Record<string, any>) {
    const code = adErrorCode(error);
    console.warn(`[Ads] ${placement} failed (${code}):`, error);
    // test_mode: test cihazlarından gelen olaylar üretim istatistiğini kirletmesin
    track('ad_load_failed', { placement, code, test_mode: isTestAdMode() });

    const key = `${placement}:${code}`;
    if (reportedIssues.has(key)) return;
    reportedIssues.add(key);
    try {
        const err = error instanceof Error ? error : new Error(`[Ads] ${placement}: ${code}`);
        Sentry.captureException(err, {
            level: 'warning',
            tags: { area: 'ads', ad_placement: placement, ad_error_code: code },
            extra,
        });
    } catch {
        // Sentry yapılandırılmamışsa sessiz geç — teşhis logu zaten yazıldı
    }
}

// ─── Frekans ayarları ────────────────────────────────────────────────────────
/** İki interstitial arası minimum süre. */
const INTERSTITIAL_GAP_MS = 4 * 60 * 1000; // 4 dakika
/** Kaç sonuçta bir interstitial denensin (cooldown ayrıca sınırlar). */
export const INTERSTITIAL_EVERY_N_RESULTS = 4;

// Yükleme başarısız olursa üstel geri çekilme ile yeniden dene. Eskiden tek
// deneme vardı ve başarısız olursa `loaded` oturum boyunca false kalıyordu.
const RETRY_BASE_MS = 4000;
const RETRY_MAX_MS = 5 * 60 * 1000;
const RETRY_MAX_ATTEMPTS = 6;

class AdManagerClass {
    private initPromise: Promise<boolean> | null = null;
    private ready = false;
    private readyListeners = new Set<(ready: boolean) => void>();

    private lastInterstitialTime = 0;
    private interstitialAd: any = null;
    private interstitialUnsubs: Array<() => void> = [];
    private interstitialAttempts = 0;
    private interstitialTimer: ReturnType<typeof setTimeout> | null = null;

    private rewardedAd: any = null;

    /**
     * SDK'yı başlatır. Idempotent: aynı promise döner, böylece çağıranlar
     * (banner dahil) init bitene kadar bekleyebilir. Google reklam isteği
     * ATILMADAN ÖNCE initialize edilmesini şart koşuyor.
     */
    init(): Promise<boolean> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            if (!MobileAds) return false;
            try {
                // setRequestConfiguration initialize'DAN ÖNCE çağrılmalı, yoksa
                // ilk reklam isteği yapılandırmayı görmez.
                if (TEST_DEVICE_IDS.length > 0) {
                    await MobileAds().setRequestConfiguration({
                        testDeviceIdentifiers: TEST_DEVICE_IDS,
                    });
                    console.log(
                        `[Ads] Test device mode: ${TEST_DEVICE_IDS.length} device(s) registered — ` +
                        `real ad units will serve TEST ads on these devices.`
                    );
                } else if (!__DEV__) {
                    // Üretim yolu; dahili teste yanlışlıkla bu şekilde çıkıldığında
                    // logda görünsün diye tek satır bırakıyoruz.
                    console.log('[Ads] Live ad mode — no test devices registered.');
                }

                await MobileAds().initialize();
                this.ready = true;
                this.loadInterstitial();
                // Rewarded bilerek ÖN YÜKLENMİYOR: hiçbir ekrana bağlı değil ve
                // gösterilmeyen istekler AdMob'da eşleşme oranını düşürür.
                // Bağlandığında showRewarded ilk çağrıda yükleyecek.
            } catch (e) {
                reportAdIssue('sdk_init', e);
                this.ready = false;
            }
            this.readyListeners.forEach(l => { try { l(this.ready); } catch {} });
            return this.ready;
        })();

        return this.initPromise;
    }

    /** SDK hazır mı (initialize tamamlandı ve başarılı). */
    get isReady() {
        return this.ready;
    }

    /** Hazır olduğunda haber ver. Aboneliği iptal eden fonksiyon döner. */
    subscribeReady(cb: (ready: boolean) => void): () => void {
        this.readyListeners.add(cb);
        return () => { this.readyListeners.delete(cb); };
    }

    private clearInterstitial() {
        this.interstitialUnsubs.forEach(u => { try { u(); } catch {} });
        this.interstitialUnsubs = [];
        this.interstitialAd = null;
        if (this.interstitialTimer) {
            clearTimeout(this.interstitialTimer);
            this.interstitialTimer = null;
        }
    }

    private scheduleInterstitialRetry() {
        if (this.interstitialAttempts >= RETRY_MAX_ATTEMPTS) return;
        const delay = Math.min(RETRY_BASE_MS * 2 ** this.interstitialAttempts, RETRY_MAX_MS);
        this.interstitialAttempts += 1;
        if (this.interstitialTimer) clearTimeout(this.interstitialTimer);
        this.interstitialTimer = setTimeout(() => this.loadInterstitial(), delay);
    }

    private loadInterstitial() {
        if (!InterstitialAd || !this.ready) return;
        const unitId = getAdUnit('interstitial');
        if (!unitId) return;

        this.clearInterstitial();
        try {
            const ad = InterstitialAd.createForAdRequest(unitId);
            this.interstitialAd = ad;

            this.interstitialUnsubs.push(
                ad.addAdEventListener(AdEventType.LOADED, () => {
                    this.interstitialAttempts = 0;
                }),
                ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
                    reportAdIssue('interstitial', error, { attempt: this.interstitialAttempts });
                    this.scheduleInterstitialRetry();
                }),
                ad.addAdEventListener(AdEventType.CLOSED, () => {
                    // Kapanır kapanmaz bir sonrakini hazırla
                    this.loadInterstitial();
                }),
            );

            ad.load();
        } catch (e) {
            reportAdIssue('interstitial_create', e);
            this.scheduleInterstitialRetry();
        }
    }

    private loadRewarded() {
        if (!RewardedAd || !this.ready) return;
        const unitId = getAdUnit('rewarded');
        if (!unitId) return;
        try {
            this.rewardedAd = RewardedAd.createForAdRequest(unitId);
            this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
                reportAdIssue('rewarded', error);
            });
            this.rewardedAd.load();
        } catch (e) {
            reportAdIssue('rewarded_create', e);
        }
    }

    /**
     * Interstitial göster — frekans sınırı uygulanır.
     * @param isPro Pro kullanıcıda atlanır
     */
    showInterstitial(isPro: boolean): boolean {
        if (isPro || !this.interstitialAd) return false;
        const now = Date.now();
        if (now - this.lastInterstitialTime < INTERSTITIAL_GAP_MS) return false;
        try {
            if (this.interstitialAd.loaded) {
                this.interstitialAd.show();
                this.lastInterstitialTime = now;
                track('ad_shown', { placement: 'interstitial', test_mode: isTestAdMode() });
                // Yeniden yükleme CLOSED olayında yapılıyor
                return true;
            }
            track('ad_not_ready', { placement: 'interstitial' });
        } catch (e) {
            reportAdIssue('interstitial_show', e);
        }
        return false;
    }

    /**
     * Rewarded video göster; ödül kazanılırsa `onRewarded` çağrılır.
     * NOT: şu an hiçbir ekrana bağlı değil. İlk çağrıda reklam yüklenir,
     * yani ilk deneme büyük ihtimalle false döner (henüz hazır değil).
     * @param isPro Pro kullanıcıda atlanır
     */
    showRewarded(isPro: boolean, onRewarded: () => void, onDismiss?: () => void): boolean {
        if (isPro) return false;
        if (!RewardedAd) {
            // Native modül yok (Expo Go) — geliştirme kolaylığı için ödülü ver
            onRewarded();
            return false;
        }
        if (!this.rewardedAd) {
            this.loadRewarded();
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
            track('ad_shown', { placement: 'rewarded', test_mode: isTestAdMode() });
            return true;
        } catch (e) {
            reportAdIssue('rewarded_show', e);
            return false;
        }
    }

    get isAvailable() {
        return !!MobileAds;
    }
}

export const AdManager = new AdManagerClass();
