// Şifre sıfırlama derin bağlantısını (deep link) oturuma çevirir.
//
// Supabase'in gönderdiği mailde link önce {SUPABASE_URL}/auth/v1/verify'a gider,
// oradan `redirectTo` adresine 302 ile döner. Token'ların URL'de nerede geldiği
// akış tipine göre değişir:
//
//   implicit (supabase-js varsayılanı) -> pickforme://reset-password#access_token=...&refresh_token=...&type=recovery
//   pkce                               -> pickforme://reset-password?code=...
//   yeni mail şablonu (.TokenHash)     -> pickforme://reset-password?token_hash=...&type=recovery
//   hata                               -> pickforme://reset-password#error=access_denied&error_code=otp_expired
//
// Üçünü de destekliyoruz: mail şablonu ya da flowType ileride değişirse akış
// sessizce bozulmasın. Not: React Native'de `detectSessionInUrl` kapalı olmak
// zorunda (web API'si), yani bu adımı elle yapmak şart.

import { supabase } from '../storage/supabase';

export type RecoveryOutcome =
    | { status: 'ok' }                          // oturum kuruldu, yeni şifre alınabilir
    | { status: 'ignored' }                     // bu link şifre sıfırlama linki değil
    | { status: 'expired' }                     // link süresi dolmuş ya da kullanılmış
    | { status: 'error'; message?: string };

// redirectTo ile aynı yol; Expo Go'da URL "exp://10.0.0.5:8081/--/reset-password#..."
// biçiminde geldiği için tam eşitlik yerine sonek kontrolü yapıyoruz.
const RECOVERY_PATH = 'reset-password';

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

/** Gelen linkin şifre sıfırlama akışına ait olup olmadığı. */
export function isRecoveryLink(url: string): boolean {
    const params = parseLinkParams(url);
    if (params.type === 'recovery') return true;
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return path.endsWith(RECOVERY_PATH);
}

/**
 * Linkteki token'ı oturuma çevirir. Başarılıysa artık `updateUser({ password })`
 * çağrılabilir. Link tek kullanımlıktır: aynı URL ikinci kez işlenirse Supabase
 * 'expired' döner, bu yüzden çağıran taraf sonucu tek seferde tüketmeli.
 */
export async function consumeRecoveryLink(url: string): Promise<RecoveryOutcome> {
    if (!isRecoveryLink(url)) return { status: 'ignored' };

    const p = parseLinkParams(url);

    // Supabase hatayı da redirect adresine iliştirir; token hiç gelmez.
    if (p.error || p.error_code) {
        const expired =
            p.error_code === 'otp_expired' || /expired|invalid/i.test(p.error_description ?? '');
        return expired
            ? { status: 'expired' }
            : { status: 'error', message: p.error_description || p.error };
    }

    try {
        if (p.access_token && p.refresh_token) {
            const { error } = await supabase.auth.setSession({
                access_token: p.access_token,
                refresh_token: p.refresh_token,
            });
            return error ? { status: 'error', message: error.message } : { status: 'ok' };
        }

        if (p.code) {
            const { error } = await supabase.auth.exchangeCodeForSession(p.code);
            return error ? { status: 'error', message: error.message } : { status: 'ok' };
        }

        if (p.token_hash) {
            const { error } = await supabase.auth.verifyOtp({
                type: 'recovery',
                token_hash: p.token_hash,
            });
            return error ? { status: 'error', message: error.message } : { status: 'ok' };
        }
    } catch (e: any) {
        return { status: 'error', message: e?.message };
    }

    // Yol doğru ama hiçbir token yok — büyük ihtimalle Supabase Dashboard'daki
    // "Redirect URLs" listesinde bu adres yok ve link Site URL'e düşmüş.
    return { status: 'error' };
}
