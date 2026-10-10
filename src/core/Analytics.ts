import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';

// ─── Anonim kullanım verisi (PostHog) — rızaya bağlı ─────────────────────────
//
// Varsayılan KAPALI: rıza durumu belli olana kadar hiçbir şey gönderilmez,
// olaylar bellekte bekler (en fazla MAX_QUEUE). Karar:
//   1. Kullanıcı Ayarlar'daki "Anonim kullanım verisi paylaş" anahtarını
//      kendisi değiştirdiyse o geçerli.
//   2. Değilse, rıza gerekmeyen bölgede (UMP: NOT_REQUIRED) açık.
//   3. Rıza gereken bölgede (AB/İngiltere) yalnızca UMP formunda "içerik
//      performansını ölçme" ve "cihazda bilgi saklama" amaçlarına izin
//      verildiyse açık.
// Rıza toplanamadıysa (ağ yok, form hatası) kapalı kalır.
//
// GeoIP kapalı (IP'den konum çıkarılmaz), yaşam döngüsü olayları kapalı,
// identify() hiç çağrılmıyor — PostHog yalnızca rastgele bir cihaz kimliği görür.

const PREF_KEY = '@pickforme:analyticsOptIn'; // 'on' | 'off' | yok

export type AnalyticsConsent =
    | { required: false }
    | { required: true; measurementAllowed: boolean };

type Props = Record<string, string | number | boolean | null>;

const MAX_QUEUE = 50;

let client: PostHog | null = null;
let userPref: 'on' | 'off' | null = null;
let consent: AnalyticsConsent | null = null; // null = henüz bilinmiyor
let prefLoaded = false;
let queue: Array<[string, Props | undefined]> = [];
const listeners = new Set<(enabled: boolean) => void>();

function decide(): boolean | null {
    if (userPref === 'on') return true;
    if (userPref === 'off') return false;
    if (!consent) return null; // karar bekleniyor
    return consent.required ? consent.measurementAllowed : true;
}

function ensureClient(): PostHog | null {
    if (client) return client;
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    if (!key) return null;
    client = new PostHog(key, {
        host: 'https://eu.i.posthog.com',
        disableGeoip: true,
        captureAppLifecycleEvents: false,
    });
    return client;
}

function apply(): void {
    const enabled = decide();
    if (enabled === null || !prefLoaded) return; // karar yok: bekle

    if (enabled) {
        const c = ensureClient();
        if (c) {
            c.optIn().catch(() => {});
            for (const [event, props] of queue) c.capture(event, props as any);
        }
    } else if (client) {
        // Daha önce açılmış bir istemciyi sustur (Ayarlar'dan kapatma / rıza geri çekme).
        client.optOut().catch(() => {});
    }
    queue = [];
    listeners.forEach(l => { try { l(enabled); } catch {} });
}

/** Açılışta bir kez: kullanıcının kayıtlı tercihini okur. */
export function initAnalytics(): void {
    AsyncStorage.getItem(PREF_KEY)
        .then(v => { userPref = v === 'on' || v === 'off' ? v : null; })
        .catch(() => {})
        .finally(() => { prefLoaded = true; apply(); });
}

/** AdManager, UMP sonucunu (ve sonradan her değişikliği) buraya bildirir. */
export function setAnalyticsConsent(next: AnalyticsConsent): void {
    consent = next;
    apply();
}

/** Ayarlar anahtarı. */
export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
    userPref = enabled ? 'on' : 'off';
    try { await AsyncStorage.setItem(PREF_KEY, userPref); } catch {}
    apply();
}

/** Şu an gönderiliyor mu? (karar bekleniyorsa false) */
export function isAnalyticsEnabled(): boolean {
    return decide() === true;
}

export function subscribeAnalytics(cb: (enabled: boolean) => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

export function track(event: string, props?: Props): void {
    const enabled = decide();
    if (enabled === true && prefLoaded) {
        ensureClient()?.capture(event, props as any);
    } else if (enabled === null || !prefLoaded) {
        if (queue.length < MAX_QUEUE) queue.push([event, props]);
    }
    // enabled === false → hiçbir şey gönderme, saklama
}
