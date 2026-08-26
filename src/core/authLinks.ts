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
import { supabase } from '../storage/supabase';

export type AuthLinkKind = 'recovery' | 'verification';

export type AuthLinkOutcome =
    | { status: 'ok'; kind: AuthLinkKind }              // oturum kuruldu
    | { status: 'ignored' }                             // bizim akışımıza ait değil
    | { status: 'expired'; kind: AuthLinkKind }         // link süresi dolmuş / kullanılmış
    | { status: 'error'; kind: AuthLinkKind; message?: string };

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
// Expo Go), ama yeni gönderilen mailler HTTPS adresini kullanıyor.
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

/**
 * URL'in hem `?query` hem `#fragment` parametrelerini tek sözlükte toplar.
 * expo-linking'in parse()'ı fragment'ı queryParams'a koymadığı için elle
 * ayrıştırıyoruz — implicit akışta token'ların tamamı fragment'ta geliyor.
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
                    return decodeURIComponent(s.replace(/\+/g, ' '));
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

/**
 * Linkteki token'ı oturuma çevirir. Link tek kullanımlıktır: aynı URL ikinci
 * kez işlenirse Supabase 'expired' döner, bu yüzden çağıran taraf sonucu tek
 * seferde tüketmeli.
 */
export async function consumeAuthLink(url: string): Promise<AuthLinkOutcome> {
    const kind = authLinkKind(url);
    if (!kind) return { status: 'ignored' };

    const p = parseLinkParams(url);

    // Supabase hatayı da redirect adresine iliştirir; token hiç gelmez.
    if (p.error || p.error_code) {
        const expired =
            p.error_code === 'otp_expired' || /expired|invalid/i.test(p.error_description ?? '');
        return expired
            ? { status: 'expired', kind }
            : { status: 'error', kind, message: p.error_description || p.error };
    }

    try {
        if (p.access_token && p.refresh_token) {
            const { error } = await supabase.auth.setSession({
                access_token: p.access_token,
                refresh_token: p.refresh_token,
            });
            return error ? { status: 'error', kind, message: error.message } : { status: 'ok', kind };
        }

        if (p.code) {
            const { error } = await supabase.auth.exchangeCodeForSession(p.code);
            return error ? { status: 'error', kind, message: error.message } : { status: 'ok', kind };
        }

        if (p.token_hash) {
            // verifyOtp'nin tipi linkten gelir; yoksa akışın varsayılanı
            const otpType = p.type || (kind === 'recovery' ? 'recovery' : 'signup');
            const { error } = await supabase.auth.verifyOtp({
                type: otpType as any,
                token_hash: p.token_hash,
            });
            return error ? { status: 'error', kind, message: error.message } : { status: 'ok', kind };
        }
    } catch (e: any) {
        return { status: 'error', kind, message: e?.message };
    }

    // Yol doğru ama hiçbir token yok — büyük ihtimalle Supabase Dashboard'daki
    // "Redirect URLs" listesinde bu adres yok ve link Site URL'e düşmüş.
    return { status: 'error', kind };
}
