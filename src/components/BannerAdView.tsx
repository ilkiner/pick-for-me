import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, AD_UNITS } from '../core/AdManager';
import { usePro } from '../store/ProContext';

interface Props {
    style?: object;
}

export function BannerAdView({ style }: Props) {
    const { isPro } = usePro();

    // Don't render anything for Pro users or if native module unavailable
    if (isPro || !BannerAd) return null;

    return (
        <View style={[styles.container, style]}>
            <BannerAd
                unitId={AD_UNITS.banner}
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
