import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, getAdUnit } from '../core/AdManager';
import { usePro } from '../store/ProContext';

interface Props {
    style?: object;
}

export function BannerAdView({ style }: Props) {
    const { isPro } = usePro();

    // Pro kullanıcı, native modül yok (Expo Go) ya da production'da
    // env'de banner ID tanımlı değilse (getAdUnit warn verir) render etme.
    const unitId = !isPro && BannerAd ? getAdUnit('banner') : null;
    if (isPro || !BannerAd || !unitId) return null;

    return (
        <View style={[styles.container, style]}>
            <BannerAd
                unitId={unitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: false }}
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
