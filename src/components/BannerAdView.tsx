import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, getAdUnit, AdManager, reportAdIssue, isTestAdMode } from '../core/AdManager';
import { track } from '../core/Analytics';
import { usePro } from '../store/ProContext';

interface Props {
    style?: object;
}

// Yükleme başarısız olursa BannerAd kendiliğinden yeniden denemez; remount
// ederek deniyoruz. Sınırlı tutuluyor, sonsuz istek atmanın anlamı yok.
const RETRY_DELAYS_MS = [10_000, 30_000, 90_000];

export function BannerAdView({ style }: Props) {
    const { isPro } = usePro();

    // SDK initialize edilmeden reklam istenmemeli (Google şartı). Eskiden
    // banner, AdManager.init() ile aynı render'da mount oluyordu ve ilk istek
    // init bitmeden gidiyordu.
    const [sdkReady, setSdkReady] = useState(() => AdManager.isReady);
    // Remount anahtarı: her artışta BannerAd sıfırdan yüklenir
    const [attempt, setAttempt] = useState(0);
    const [gaveUp, setGaveUp] = useState(false);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (AdManager.isReady) {
            setSdkReady(true);
            return;
        }
        return AdManager.subscribeReady(setSdkReady);
    }, []);

    useEffect(() => () => {
        if (retryTimer.current) clearTimeout(retryTimer.current);
    }, []);

    // Pro kullanıcı, native modül yok (Expo Go) ya da production'da env'de
    // banner ID tanımlı değilse (getAdUnit warn verir) render etme.
    const unitId = !isPro && BannerAd ? getAdUnit('banner') : null;
    if (isPro || !BannerAd || !unitId || !sdkReady || gaveUp) return null;

    return (
        <View style={[styles.container, style]}>
            <BannerAd
                key={attempt}
                unitId={unitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: false }}
                onAdLoaded={() => {
                    // Üretimde banner'ın gerçekten dolup dolmadığını görmenin
                    // tek yolu bu — eskiden ne başarı ne hata iz bırakıyordu.
                    track('ad_loaded', { placement: 'banner', attempt, test_mode: isTestAdMode() });
                }}
                onAdFailedToLoad={(error: any) => {
                    reportAdIssue('banner', error, { attempt });
                    const delay = RETRY_DELAYS_MS[attempt];
                    if (delay === undefined) {
                        // Denemeler bitti: boş kap bırakma, kartlar arasında
                        // açıklanamayan bir boşluk görünmesin.
                        setGaveUp(true);
                        return;
                    }
                    if (retryTimer.current) clearTimeout(retryTimer.current);
                    retryTimer.current = setTimeout(() => setAttempt(a => a + 1), delay);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: '100%',
    },
});
