// Google ile giriş — yerel akış (tarayıcı yok).
//
// Google'dan bir OIDC id_token alıyoruz ve onu Supabase'e veriyoruz; Supabase
// token'ı Google'ın anahtarlarıyla doğrulayıp oturum açıyor. Tarayıcıya ya da
// redirect adresine hiç çıkılmıyor, yani App Links / Gmail tarayıcısı
// sorunlarının hiçbiri bu akışı ilgilendirmiyor.
//
// Oturum kurulduktan SONRA hiçbir özel iş yok: supabase-js 'SIGNED_IN' yayar,
// ProContext RevenueCat kimliğini Supabase uuid'sine bağlar, App.tsx bulut
// senkronunu başlatır. E-posta/şifre girişiyle birebir aynı yol.
//
// ⚠ GÜVENLİK — bu akışın çalışması için Supabase'de "Confirm email" AÇIK olmalı.
// Kapalıyken Supabase her parola kaydını e-postası doğrulanmış gibi işaretliyor,
// ve doğrulanmış e-posta Google kimliğinin AYNI kullanıcıya otomatik
// bağlanmasının koşulu. Yani biri başkasının Gmail adresiyle parola hesabı
// açarsa, gerçek sahibi Google ile girdiğinde saldırganın parolası o hesabı
// açmaya devam eder. Ayrıntı ve doğrulama adımları: store/GOOGLE_SIGNIN.md

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { supabase, isSupabaseConfigured } from '../storage/supabase';

// Google Cloud Console > Credentials > OAuth 2.0 Client IDs > **Web application**.
// Android istemcisinin kendi ID'si BURAYA GİRİLMEZ: Android istemcisi yalnızca
// paket adı + SHA-1 ile imzayı doğrulamak için var, id_token'ın `aud` alanı ise
// web istemcisine ait oluyor ve Supabase'in beklediği de o.
//
// trim() şart: EAS ortam değişkenine yapıştırılan değer sonunda bir satır sonu
// taşıyordu ("….googleusercontent.com\n") ve olduğu gibi bundle'a gömüldü.
// Google bu ID'yi eşleştiremeyince her girişte DEVELOPER_ERROR döndü (build 9).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

// Modülü isteğe bağlı yüklüyoruz: Expo Go'da ve yapılandırılmamış derlemelerde
// yerel modül yok ve import etmek anında çökerdi. Aynı desen AdManager ve
// ProContext'te de kullanılıyor.
let GoogleSignin: any = null;
let statusCodes: any = {};
try {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes ?? {};
} catch {
    // Yerel modül yok — düğme gizlenecek
}

export type GoogleSignInOutcome =
    | { status: 'ok' }
    | { status: 'cancelled' }                       // kullanıcı vazgeçti: SESSİZ geç
    | { status: 'unavailable'; reason: string }     // Play Services / yapılandırma
    | { status: 'error'; message?: string };

let configured = false;

/** Düğme gösterilsin mi? Yerel modül + web client ID + Supabase şart. */
export function isGoogleSignInAvailable(): boolean {
    return Boolean(GoogleSignin && WEB_CLIENT_ID && isSupabaseConfigured());
}

function ensureConfigured(): void {
    if (configured || !GoogleSignin || !WEB_CLIENT_ID) return;
    GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        // Varsayılan kapsamlar zaten email + profile; başka bir şey istemiyoruz.
        // Fazladan kapsam istemek Google'ın onay ekranını büyütür ve yayın için
        // doğrulama gerektirebilir.
        scopes: ['email', 'profile'],
        // offlineAccess kapalı: sunucumuz Google API'lerine kullanıcı adına
        // erişmiyor, dolayısıyla serverAuthCode'a ihtiyacımız yok.
        offlineAccess: false,
    });
    configured = true;
}

function crumb(message: string, data?: Record<string, unknown>): void {
    try {
        Sentry.addBreadcrumb({ category: 'auth.google', level: 'info', message, data });
    } catch {
        // Sentry yapılandırılmamış — sessiz geç
    }
}

/**
 * Hesap seçiciyi açar, seçilen hesabın id_token'ını Supabase oturumuna çevirir.
 *
 * Vazgeçme bir HATA DEĞİL: kütüphane v13+ sürümlerinde iptali fırlatmak yerine
 * `{ type: 'cancelled' }` döndürüyor, ama eski davranışın da (SIGN_IN_CANCELLED
 * koduyla fırlatma) karşılığı var — ikisini de sessiz iptale çeviriyoruz.
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
    if (!GoogleSignin) return { status: 'unavailable', reason: 'native_module_missing' };
    if (!WEB_CLIENT_ID) return { status: 'unavailable', reason: 'web_client_id_missing' };
    if (!isSupabaseConfigured()) return { status: 'unavailable', reason: 'supabase_not_configured' };

    try {
        ensureConfigured();

        if (Platform.OS === 'android') {
            // Play Services yoksa (bazı Huawei cihazlar, bazı emülatörler) akış
            // hiç başlamaz. Bunu önceden öğrenip anlamlı bir mesaj veriyoruz.
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }

        crumb('opening account picker');
        const result = await GoogleSignin.signIn();

        if (!result || result.type === 'cancelled') {
            crumb('cancelled by user');
            return { status: 'cancelled' };
        }

        const idToken: string | null = result.data?.idToken ?? null;
        if (!idToken) {
            // webClientId yanlış ya da eksikse Google hesabı döndürür ama
            // id_token'ı boş bırakır — sessizce "çalışmıyor" gibi görünen hâli
            // budur, o yüzden ayrı bir mesajla ayırıyoruz.
            crumb('no id token in response');
            return { status: 'unavailable', reason: 'no_id_token' };
        }

        crumb('exchanging id token with supabase');
        const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
        });

        if (error) {
            crumb('supabase rejected id token', { error: error.message });
            try {
                Sentry.captureException(error, { tags: { area: 'auth_google', step: 'id_token' } });
            } catch {
                // Sentry yoksa sessiz geç
            }
            return { status: 'error', message: error.message };
        }

        crumb('signed in');
        return { status: 'ok' };
    } catch (e: any) {
        const code = e?.code;

        // Eski sürüm davranışı ve kullanıcının geri tuşuyla kapatması.
        if (code === statusCodes.SIGN_IN_CANCELLED) {
            crumb('cancelled by user (thrown)');
            return { status: 'cancelled' };
        }
        // Hesap seçici zaten açık — ikinci dokunuş. Kullanıcıya hata göstermeye
        // değmez, açık olan pencere zaten önünde duruyor.
        if (code === statusCodes.IN_PROGRESS) {
            crumb('already in progress');
            return { status: 'cancelled' };
        }
        if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            crumb('play services unavailable');
            return { status: 'unavailable', reason: 'play_services' };
        }

        crumb('threw', { code, error: e?.message });
        try {
            Sentry.captureException(e, { tags: { area: 'auth_google', step: 'native' } });
        } catch {
            // Sentry yoksa sessiz geç
        }
        return { status: 'error', message: e?.message };
    }
}

/**
 * Uygulamadan çıkarken Google oturumunu da bırakır.
 *
 * Yapılmazsa bir sonraki "Google ile devam et" hesap seçiciyi hiç göstermeden
 * son hesapla giriyor: cihazı paylaşan ya da hesap değiştirmek isteyen kullanıcı
 * kendi hesabına geçemiyor.
 */
export async function signOutFromGoogle(): Promise<void> {
    if (!GoogleSignin) return;
    try {
        await GoogleSignin.signOut();
    } catch {
        // Google oturumu bırakılamadıysa bile Supabase çıkışı yapılmalı
    }
}
