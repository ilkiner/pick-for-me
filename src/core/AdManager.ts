// AdMob wrapper — graceful fallback when native module not available (Expo Go)
let MobileAds: any = null;
let RewardedAd: any = null;
let InterstitialAd: any = null;
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let AdsConsent: any = null;
let AdsConsentDebugGeography: any = null;

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
    AdsConsent = lib.AdsConsent;
    AdsConsentDebugGeography = lib.AdsConsentDebugGeography;
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

// ─── Test birimlerine zorlama ────────────────────────────────────────────────
// TEST_DEVICE_IDS en sadık çözüm ama her testçiden logcat çıktısı istemeyi
// gerektiriyor — 12 kişilik bir grupta pratik değil. Bu bayrak açıkken cihaz
// kaydına gerek kalmadan Google'ın evrensel test birimlerine düşülür: testçiler
// reklamın yerleşimini, boyutunu ve akışını görür, ama TEK BİR gerçek gösterim
// bile üretilmez, dolayısıyla geçersiz trafik riski sıfırdır.
//
// Karşılığında gerçek birimin yapılandırması (fill oranı, aracı ağlar) test
// EDİLMEZ; onu doğrulamak için kayıtlı test cihazı gerekir.
//
// EAS'te YALNIZCA preview ortamında tanımlanır. Production'da tanımsız kalır —
// oraya sızarsa uygulama para kazanmayı bırakır, bu yüzden yalnızca birebir
// "true" kabul ediliyor.
const FORCE_TEST_UNITS =
    String(process.env.EXPO_PUBLIC_ADMOB_FORCE_TEST_UNITS ?? '').trim().toLowerCase() === 'true';

/** Bu build test reklamı mı gösteriyor (dev, zorlama bayrağı ya da kayıtlı test cihazı)? */
export function isTestAdMode(): boolean {
    return __DEV__ || FORCE_TEST_UNITS || TEST_DEVICE_IDS.length > 0;
}

const warned = new Set<AdUnitKind>();

/** Kullanılacak reklam birimi ID'si; production'da env eksikse null (reklam yok). */
export function getAdUnit(kind: AdUnitKind): string | null {
    if (__DEV__ || FORCE_TEST_UNITS) return TEST_UNITS[kind];
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

// ─── Rıza (UMP) ──────────────────────────────────────────────────────────────
// AB/İngiltere kullanıcıları için AdMob'un User Messaging Platform formu GDPR
// gereği ZORUNLU; rıza toplanmadan reklam istenirse hem yasal sorun olur hem de
// AdMob genellikle no-fill döner. Form yalnızca gereken bölgelerde gösterilir;
// AB dışında `NOT_REQUIRED` gelir ve akış görünmez şekilde geçer.
//
// Şimdilik yalnızca Android (iOS ATT ayrı bir iş).
const CONSENT_ENABLED = Platform.OS === 'android';

class AdManagerClass {
    private initPromise: Promise<boolean> | null = null;
    private ready = false;
    private readyListeners = new Set<(ready: boolean) => void>();
    private privacyOptionsRequired = false;

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

            // Rıza HER ŞEYDEN ÖNCE: SDK başlatılmadan ve tek bir reklam
            // istenmeden önce toplanmalı.
            if (!(await this.gatherConsent())) {
                this.ready = false;
                this.readyListeners.forEach(l => { try { l(false); } catch {} });
                return false;
            }

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
                } else if (FORCE_TEST_UNITS) {
                    console.log(
                        '[Ads] Forced test units — Google universal test ad units in use. ' +
                        'No real impressions are generated by this build.'
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

    /**
     * UMP rızasını toplar. Reklam istenebiliyorsa true döner.
     *
     * Hata durumunda ÖNCE cihazda önbelleklenmiş rıza durumuna bakılır (UMP
     * kararı yerelde saklar, ağ gerektirmez). O da okunamıyorsa kapalı tarafa
     * düşüyoruz: rızayı doğrulayamadan reklam istemek GDPR açısından yanlış
     * taraf. Pratikte bu yalnızca ağın hiç olmadığı ilk açılışta olur — zaten
     * reklam da dolmazdı.
     */
    private async gatherConsent(): Promise<boolean> {
        if (!CONSENT_ENABLED || !AdsConsent) return true;

        try {
            const info = await AdsConsent.gatherConsent({
                testDeviceIdentifiers: TEST_DEVICE_IDS,
                // Kayıtlı test cihazlarında formu AB'deymiş gibi zorla; aksi
                // halde AB dışında test ederken form hiç görünmez.
                debugGeography: TEST_DEVICE_IDS.length > 0 && AdsConsentDebugGeography
                    ? AdsConsentDebugGeography.EEA
                    : undefined,
            });
            this.privacyOptionsRequired = info?.privacyOptionsRequirementStatus === 'REQUIRED';
            track('ads_consent', {
                status: String(info?.status ?? 'UNKNOWN'),
                can_request_ads: !!info?.canRequestAds,
                test_mode: isTestAdMode(),
            });
            return !!info?.canRequestAds;
        } catch (e) {
            reportAdIssue('consent', e);
            try {
                const cached = await AdsConsent.getConsentInfo();
                this.privacyOptionsRequired = cached?.privacyOptionsRequirementStatus === 'REQUIRED';
                return !!cached?.canRequestAds;
            } catch {
                return false;
            }
        }
    }

    /**
     * AB kullanıcısı rızasını sonradan değiştirebilmeli — UMP politikası bunu
     * şart koşuyor. Yalnızca gerekli olduğunda (bkz. Ayarlar) gösterilir.
     */
    get isPrivacyOptionsRequired() {
        return this.privacyOptionsRequired;
    }

    /** Gizlilik seçenekleri formunu açar (rızayı geri çekme / değiştirme). */
    async showPrivacyOptions(): Promise<void> {
        if (!AdsConsent) return;
        try {
            await AdsConsent.showPrivacyOptionsForm();
        } catch (e) {
            reportAdIssue('consent_privacy_form', e);
        }
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
