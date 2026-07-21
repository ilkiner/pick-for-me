import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { useTheme } from '../store/ThemeContext';
import { usePro } from '../store/ProContext';
import { AppTheme } from '../core/Theme';

// Story boyutunda (9:16, 1080×1920) ÖZEL tasarlanmış paylaşım kartı.
// Ekran görüntüsü değil: offscreen render edilir, view-shot ile 1080×1920
// PNG'ye ölçeklenir ve expo-sharing ile paylaşılır.
//
// Kullanım:
//   const shareCard = useRef<ShareCardHandle>(null);
//   <ShareCard ref={shareCard} />            // ekran dışında görünmez durur
//   await shareCard.current?.share({ text: 'Bu akşam: Inception 🍿', badge: 'Film' });

export interface ShareCardContent {
    // Büyük sonuç metni — ör. "Bu akşam: Inception 🍿"
    text: string;
    // Küçük rozet — araç/kategori adı (ör. "Film Seç", "Bugünün Görevi")
    badge?: string;
    // Metnin üstünde büyük dekoratif emoji (ör. "🍿", "⚡")
    emoji?: string;
}

export interface ShareCardHandle {
    share: (content: ShareCardContent) => Promise<void>;
    isBusy: () => boolean;
}

// Tasarım 360×640 birimde kurulur; capture 1080×1920'ye ölçekler (×3).
const W = 360;
const H = 640;

export const ShareCard = forwardRef<ShareCardHandle>(function ShareCard(_props, ref) {
    const { theme, isDark } = useThemeSafe();
    const { isPro } = usePro();
    const [content, setContent] = useState<ShareCardContent | null>(null);
    const viewRef = useRef<View>(null);
    const busyRef = useRef(false);

    useImperativeHandle(ref, () => ({
        isBusy: () => busyRef.current,
        share: async (c: ShareCardContent) => {
            if (busyRef.current) return;
            busyRef.current = true;
            setContent(c);
            try {
                // Offscreen görünümün yerleşmesi için kısa bekleme
                await new Promise<void>(resolve => setTimeout(resolve, 120));
                const uri = await captureRef(viewRef, {
                    format: 'png',
                    quality: 1,
                    width: 1080,
                    height: 1920,
                });
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, { mimeType: 'image/png' });
                }
            } catch {
                // paylaşım iptal / hata — sessiz geç
            } finally {
                busyRef.current = false;
                setContent(null);
            }
        },
    }), []);

    if (!content) return null;

    const styles = createStyles(theme);
    const [g1, g2] = theme.gradients.primary;

    return (
        <View style={styles.offscreen} pointerEvents="none">
            <View ref={viewRef} collapsable={false} style={styles.card}>
                {/* Marka gradyanlı arka plan + yumuşak ışık halkaları */}
                <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
                    <Defs>
                        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={theme.colors.backgroundGradient[1]} />
                            <Stop offset="0.55" stopColor={theme.colors.background} />
                            <Stop offset="1" stopColor={theme.colors.backgroundGradient[1]} />
                        </LinearGradient>
                        <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={g1} />
                            <Stop offset="1" stopColor={g2} />
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width={W} height={H} fill="url(#bg)" />
                    <Circle cx={W * 0.85} cy={H * 0.12} r="130" fill={g1} opacity={isDark ? 0.16 : 0.10} />
                    <Circle cx={W * 0.10} cy={H * 0.80} r="160" fill={g2} opacity={isDark ? 0.14 : 0.08} />
                    {/* İnce marka şeridi (üst) */}
                    <Rect x="0" y="0" width={W} height="6" fill="url(#brand)" />
                </Svg>

                {/* Üst: küçük zarif logo/ad */}
                <View style={styles.logoWrap}>
                    <View style={styles.logoMark}>
                        <Text style={styles.logoEmoji}>🎲</Text>
                    </View>
                    <Text style={styles.logoText}>Pick For Me</Text>
                </View>

                {/* Orta: rozet + büyük sonuç metni */}
                <View style={styles.center}>
                    {!!content.badge && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{content.badge}</Text>
                        </View>
                    )}
                    {!!content.emoji && <Text style={styles.bigEmoji}>{content.emoji}</Text>}
                    <Text style={styles.resultText} adjustsFontSizeToFit numberOfLines={6}>
                        {content.text}
                    </Text>
                </View>

                {/* Alt: free'de küçük filigran — Pro'da yok */}
                <View style={styles.footer}>
                    {!isPro && <Text style={styles.watermark}>🎲 Pick For Me</Text>}
                </View>
            </View>
        </View>
    );
});

// ThemeContext isDark sağlamıyorsa arka plan renginden türet.
function useThemeSafe() {
    const ctx = useTheme() as any;
    const theme: AppTheme = ctx.theme;
    const isDark: boolean = typeof ctx.isDark === 'boolean'
        ? ctx.isDark
        : theme.colors.statusBar === 'light';
    return { theme, isDark };
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        // Ekran dışında tut; görünür arayüzü etkilemesin
        offscreen: { position: 'absolute', left: -W - 40, top: 0, width: W, height: H, opacity: 1 },
        card: { width: W, height: H, overflow: 'hidden' },
        logoWrap: { alignItems: 'center', marginTop: 56, gap: 10 },
        logoMark: {
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            alignItems: 'center', justifyContent: 'center',
        },
        logoEmoji: { fontSize: 22 },
        logoText: {
            color: theme.colors.textSecondary, fontSize: 13, fontWeight: '800',
            letterSpacing: 3, textTransform: 'uppercase',
        },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 18 },
        badge: {
            paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
            backgroundColor: theme.colors.primary + '22',
            borderWidth: 1, borderColor: theme.colors.primary + '55',
        },
        badgeText: {
            color: theme.colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1,
            textTransform: 'uppercase',
        },
        bigEmoji: { fontSize: 64, lineHeight: 72 },
        resultText: {
            color: theme.colors.text, fontSize: 34, fontWeight: '900',
            textAlign: 'center', lineHeight: 44, letterSpacing: 0.2,
        },
        footer: { alignItems: 'center', marginBottom: 40, minHeight: 20 },
        watermark: {
            color: theme.colors.textSecondary, opacity: 0.45,
            fontSize: 12, fontWeight: '700', letterSpacing: 1.5,
        },
    });
}
