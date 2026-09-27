// Supabase kimlik doğrulama derin bağlantılarını (deep link) oturuma çevirir.
//
// İki akış aynı mekanizmayı kullanıyor:
//   şifre sıfırlama  -> pickforme://reset-password
//   e-posta doğrulama -> pickforme://verify-email
//
// Supabase'in gönderdiği mailde link önce {SUPABASE_URL}/auth/v1/verify'a gider,
// oradan `redirectTo` adresine 302 ile döner. Token'ların URL'de nerede geldiği
// akış tipine göre değişir:
//
//   implicit (supabase-js varsayılanı) -> ...#access_token=...&refresh_token=...&type=recovery
//   pkce                               -> ...?code=...
//   yeni mail şablonu (.TokenHash)     -> ...?token_hash=...&type=signup
//   hata                               -> ...#error=access_denied&error_code=otp_expired
//
// Üçünü de destekliyoruz: mail şablonu ya da flowType ileride değişirse akış
// sessizce bozulmasın. Not: React Native'de `detectSessionInUrl` kapalı olmak
// zorunda (web API'si), yani bu adımı elle yapmak şart.

import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../storage/supabase';

export type AuthLinkKind = 'recovery' | 'verification';

/** Hata neden başarısız oldu — çağıran taraf doğru mesajı seçebilsin diye. */
export type AuthLinkFailure =
    | 'verify_failed'   // Supabase token'ı reddetti
    | 'no_token'        // yol bizim ama linkte hiç token yok
    | 'unexpected';     // ağ / depolama / beklenmeyen istisna

export type AuthLinkOutcome =
    | { status: 'ok'; kind: AuthLinkKind }              // oturum kuruldu
    | { status: 'ignored' }                             // bizim akışımıza ait değil
    | { status: 'expired'; kind: AuthLinkKind }         // link süresi dolmuş / kullanılmış
    | { status: 'error'; kind: AuthLinkKind; reason: AuthLinkFailure; message?: string };

// ─── Adresler ────────────────────────────────────────────────────────────────
// Artık Android App Links kullanıyoruz: doğrulanmış HTTPS bağlantısı.
//
// Neden: `pickforme://` gibi özel bir şemayı cihazdaki HERHANGİ bir uygulama
// kaydedebilir. Aynı şemayı kaydeden kötü niyetli bir uygulama şifre sıfırlama
// linkindeki access_token'ı alabilir — doğrudan hesap ele geçirme. HTTPS App
// Link'te ise Android, /.well-known/assetlinks.json dosyasını alan adından
// çekip uygulamanın imza parmak iziyle karşılaştırır; eşleşmeyen bir uygulama
// linki AÇAMAZ.
//
// Özel şema geriye dönük uyumluluk için tanınmaya devam ediyor (eski mailler,
// Expo Go) ve docs/ açılış sayfasındaki "Uygulamada aç" düğmesi de onu
// kullanıyor — Gmail'in tarayıcısı App Link'i devralamadığında tek çıkış yolu o.
// Düğme Android'de `intent://...;package=com.pickforme.app;end` üretiyor: paket
// sabitlendiği için linki başka bir uygulama karşılayamıyor. Ayrıca taşınan şey
// `access_token` değil tek kullanımlık `token_hash`; tek başına oturum değil.
const APP_LINK_HOST = 'ilkiner.github.io';
const APP_LINK_BASE_PATH = '/pick-for-me';

// redirectTo ile aynı yol sonekleri; Expo Go'da URL
// "exp://10.0.0.5:8081/--/verify-email#..." biçiminde geldiği için tam eşitlik
// yerine sonek kontrolü yapıyoruz.
const PATHS: Record<AuthLinkKind, string> = {
    recovery: 'reset-password',
    verification: 'verify-email',
};

/**
 * Supabase'e verilecek `redirectTo` adresi.
 *
 * Üretimde doğrulanmış HTTPS App Link; geliştirmede Expo Go / dev client'ın
 * anlayacağı yerel şema (App Links yalnızca imzalı derlemede doğrulanır).
 * Üretilen HER İKİ adresin de Supabase > Authentication > Redirect URLs
 * listesinde olması gerekir.
 */
export function authRedirectUrl(kind: AuthLinkKind): string {
    if (__DEV__) return Linking.createURL(PATHS[kind]);
    return `https://${APP_LINK_HOST}${APP_LINK_BASE_PATH}/${PATHS[kind]}`;
}

// Supabase'in `type` parametresi ile akış eşlemesi
const TYPE_KINDS: Record<string, AuthLinkKind> = {
    recovery: 'recovery',
    signup: 'verification',
    email: 'verification',
    email_change: 'verification',
    invite: 'verification',
    magiclink: 'verification',
};

// Breadcrumb'a ASLA girmeyecek parametreler. Değerleri gizli; yalnızca varlığı
// ve uzunluğu loglanıyor — Sentry'de token taşımak istemiyoruz.
const SECRET_PARAMS = ['token_hash', 'token', 'access_token', 'refresh_token', 'code'];

/** Sentry kırıntısı bırak. Sentry kurulu değilse (DSN yok) sessiz geç. */
function crumb(message: string, data?: Record<string, unknown>): void {
    try {
        Sentry.addBreadcrumb({ category: 'auth.deeplink', level: 'info', message, data });
    } catch {
        // Sentry yapılandırılmamış — teşhis kırıntısı olmadan devam
    }
}

/** Linkin Sentry'ye yazılabilir hâli: yol + parametre adları, değerler gizli. */
export function redactAuthLink(url: string): string {
    const path = url.split(/[?#]/)[0];
    const keys = Object.keys(parseLinkParams(url)).map(k =>
        SECRET_PARAMS.includes(k) ? `${k}=<redacted>` : k,
    );
    return keys.length ? `${path}?${keys.join('&')}` : path;
}

/**
 * URL'in hem `?query` hem `#fragment` parametrelerini tek sözlükte toplar.
 * expo-linking'in parse()'ı fragment'ı queryParams'a koymadığı için elle
 * ayrıştırıyoruz — implicit akışta token'ların tamamı fragment'ta geliyor.
 *
 * '+' KARAKTERİ BOŞLUĞA ÇEVRİLMEZ. O dönüşüm form gövdelerine (x-www-form-
 * urlencoded) özgü; URL'de '+' geçerli bir veri karakteri. Supabase token'ları
 * base64 tabanlı olduğu için '+' içerebiliyor ve onu boşluğa çevirmek token'ı
 * sessizce bozar: link "geçersiz" görünür, sebebi de görünmez.
 */
export function parseLinkParams(url: string): Record<string, string> {
    const out: Record<string, string> = {};
    // İlk parça yol; sonrasındaki tüm '?' / '#' bölümlerini tara.
    for (const section of url.split(/[?#]/).slice(1)) {
        for (const pair of section.split('&')) {
            if (!pair) continue;
            const eq = pair.indexOf('=');
            const rawKey = eq === -1 ? pair : pair.slice(0, eq);
            const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
            if (!rawKey) continue;
            const decode = (s: string) => {
                try {
                    return decodeURIComponent(s);
                } catch {
                    return s;
                }
            };
            out[decode(rawKey)] = decode(rawValue);
        }
    }
    return out;
}

/**
 * Adres bize ait mi?
 *
 * Özel şema (pickforme://) ve Expo Go (exp://) adreslerinde işletim sistemi
 * linki zaten bu uygulamaya yönlendirmiş oluyor. HTTPS'te ise alan adını TAM
 * eşitlikle doğruluyoruz: `https://evil.com/reset-password#type=recovery`
 * gibi bir adres token değişimini tetiklememeli. Düz http kabul edilmiyor.
 */
function isTrustedOrigin(url: string): boolean {
    if (!/^https?:/i.test(url)) return true;
    if (!/^https:\/\//i.test(url)) return false;
    const host = url.slice('https://'.length).split(/[/?#]/)[0].toLowerCase();
    return host === APP_LINK_HOST;
}

/** Link hangi akışa ait? Bizim akışlarımızdan biri değilse null. */
export function authLinkKind(url: string): AuthLinkKind | null {
    if (!isTrustedOrigin(url)) return null;
    const params = parseLinkParams(url);
    const byType = params.type ? TYPE_KINDS[params.type] : undefined;
    if (byType) return byType;

    const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
    if (path.endsWith(PATHS.recovery)) return 'recovery';
    if (path.endsWith(PATHS.verification)) return 'verification';
    return null;
}

/** Supabase hata metni "link tükenmiş" anlamına mı geliyor? */
function looksExpired(message: string | undefined, code?: string): boolean {
    if (code === 'otp_expired') return true;
    return /expired|invalid|already been used|not found/i.test(message ?? '');
}

/**
 * Linkteki token'ı oturuma çevirir. Link tek kullanımlıktır: aynı URL ikinci
 * kez işlenirse Supabase 'expired' döner, bu yüzden çağıran taraf sonucu tek
 * seferde tüketmeli.
 *
 * Her adım Sentry'ye kırıntı bırakıyor: bu akış yalnızca gerçek cihazda, gerçek
 * mailde çalışıyor — hata aldığımızda elimizde başka iz olmuyor.
 */
export async function consumeAuthLink(url: string): Promise<AuthLinkOutcome> {
    const kind = authLinkKind(url);
    crumb('link received', { url: redactAuthLink(url), kind: kind ?? 'none' });

    if (!kind) return { status: 'ignored' };

    const p = parseLinkParams(url);

    // Supabase hatayı da redirect adresine iliştirir; token hiç gelmez.
    if (p.error || p.error_code) {
        crumb('link carries error', { kind, error: p.error, error_code: p.error_code });
        return looksExpired(p.error_description, p.error_code)
            ? { status: 'expired', kind }
            : {
                  status: 'error',
                  kind,
                  reason: 'verify_failed',
                  message: p.error_description || p.error,
              };
    }

    try {
        if (p.access_token && p.refresh_token) {
            crumb('setSession start', { kind });
            const { error } = await supabase.auth.setSession({
                access_token: p.access_token,
                refresh_token: p.refresh_token,
            });
            crumb('setSession done', { kind, ok: !error, error: error?.message });
            if (!error) return { status: 'ok', kind };
            return looksExpired(error.message)
                ? { status: 'expired', kind }
                : { status: 'error', kind, reason: 'verify_failed', message: error.message };
        }

        if (p.code) {
            crumb('exchangeCodeForSession start', { kind });
            const { error } = await supabase.auth.exchangeCodeForSession(p.code);
            crumb('exchangeCodeForSession done', { kind, ok: !error, error: error?.message });
            if (!error) return { status: 'ok', kind };
            return looksExpired(error.message)
                ? { status: 'expired', kind }
                : { status: 'error', kind, reason: 'verify_failed', message: error.message };
        }

        if (p.token_hash) {
            // verifyOtp'nin tipi linkten gelir; yoksa akışın varsayılanı
            const otpType = p.type || (kind === 'recovery' ? 'recovery' : 'signup');
            crumb('verifyOtp start', { kind, otpType, tokenLength: p.token_hash.length });
            const { error } = await supabase.auth.verifyOtp({
                type: otpType as any,
                token_hash: p.token_hash,
            });
            crumb('verifyOtp done', { kind, otpType, ok: !error, error: error?.message });
            if (!error) return { status: 'ok', kind };
            return looksExpired(error.message)
                ? { status: 'expired', kind }
                : { status: 'error', kind, reason: 'verify_failed', message: error.message };
        }
    } catch (e: any) {
        // verifyOtp AuthError DIŞINDAKİ her şeyi yeniden fırlatıyor: ağ kopması,
        // SecureStore yazma hatası, JSON bozulması. Bunlar eskiden mesajsız bir
        // 'error' olup kullanıcıya boş bir uyarı olarak dönüyordu.
        crumb('exchange threw', { kind, error: e?.message });
        try {
            Sentry.captureException(e, { tags: { area: 'auth_deeplink', kind } });
        } catch {
            // Sentry yoksa sessiz geç — kırıntı zaten yazıldı
        }
        return { status: 'error', kind, reason: 'unexpected', message: e?.message };
    }

    // Yol doğru ama hiçbir token yok — büyük ihtimalle Supabase Dashboard'daki
    // "Redirect URLs" listesinde bu adres yok ve link Site URL'e düşmüş, ya da
    // uygulama linkle değil (Play Store'dan "Aç" gibi) doğrudan açıldı.
    crumb('no token in link', { kind, params: Object.keys(p).join(',') || 'none' });
    return { status: 'error', kind, reason: 'no_token' };
}
