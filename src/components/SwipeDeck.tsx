import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    runOnJS,
    Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { AppTheme } from '../core/Theme';
import SoundManager from '../core/SoundManager';
import { MatchItem } from '../core/MatchEngine';

interface SwipeDeckProps {
    items: MatchItem[];
    onComplete: (likedIds: string[]) => void;
}

const SWIPE_OUT_DURATION = 260;

export function SwipeDeck({ items, onComplete }: SwipeDeckProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [index, setIndex] = useState(0);
    const likedIdsRef = useRef<string[]>([]);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    // Kart dışarı uçarken yeni dokunuş/butonu kilitler (UI + JS ortak bayrak).
    const isLocked = useSharedValue(false);

    const swipeThreshold = width * 0.3;
    const flyOutX = width * 1.4;

    // JS tarafı: swipe tamamlandığında çağrılır (UI thread'den runOnJS ile).
    const handleSwiped = (liked: boolean) => {
        const current = items[index];
        if (current && liked) likedIdsRef.current.push(current.id);

        Haptics.impactAsync(liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        SoundManager.play('tap');

        const next = index + 1;
        setIndex(next);
        translateX.value = 0;
        translateY.value = 0;
        isLocked.value = false;

        if (next >= items.length) {
            onComplete([...likedIdsRef.current]);
        }
    };

    const flyOut = (liked: boolean) => {
        'worklet';
        isLocked.value = true;
        translateX.value = withTiming(liked ? flyOutX : -flyOutX, { duration: SWIPE_OUT_DURATION }, (finished) => {
            if (finished) runOnJS(handleSwiped)(liked);
        });
    };

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            if (isLocked.value) return;
            translateX.value = e.translationX;
            translateY.value = e.translationY * 0.4;
        })
        .onEnd((e) => {
            if (isLocked.value) return;
            const passedDistance = Math.abs(translateX.value) > swipeThreshold;
            const passedVelocity = Math.abs(e.velocityX) > 900;
            if (passedDistance || passedVelocity) {
                // Yön: mesafe eşiği aşıldıysa konuma, yoksa fırlatma hızına göre.
                flyOut(passedDistance ? translateX.value > 0 : e.velocityX > 0);
            } else {
                translateX.value = withSpring(0, { damping: 16 });
                translateY.value = withSpring(0, { damping: 16 });
            }
        });

    // Butonla oynama (❌ / ❤️) — kartı programatik uçur.
    const swipeByButton = (liked: boolean) => {
        if (isLocked.value || index >= items.length) return;
        isLocked.value = true;
        translateX.value = withTiming(liked ? flyOutX : -flyOutX, { duration: SWIPE_OUT_DURATION }, (finished) => {
            if (finished) runOnJS(handleSwiped)(liked);
        });
    };

    const topCardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            // Kart uçarken hafif rotasyon: kaydırma mesafesiyle orantılı.
            { rotate: `${interpolate(translateX.value, [-width, 0, width], [-14, 0, 14], Extrapolation.CLAMP)}deg` },
        ],
    }));

    const likeOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1], Extrapolation.CLAMP),
    }));

    const nopeOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-swipeThreshold, 0], [1, 0], Extrapolation.CLAMP),
    }));

    const nextCardStyle = useAnimatedStyle(() => {
        const progress = interpolate(Math.abs(translateX.value), [0, width * 0.5], [0, 1], Extrapolation.CLAMP);
        return {
            transform: [{ scale: 0.94 + progress * 0.06 }],
            opacity: 0.75 + progress * 0.25,
        };
    });

    const current = items[index];
    const next = items[index + 1];

    if (!current) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.progress}>{index + 1} / {items.length}</Text>

            <View style={styles.deckArea}>
                {next && (
                    <Animated.View style={[styles.card, styles.cardBehind, nextCardStyle]}>
                        <Text style={styles.cardText} adjustsFontSizeToFit numberOfLines={4}>{next.label}</Text>
                    </Animated.View>
                )}

                <GestureDetector gesture={pan}>
                    <Animated.View style={[styles.card, topCardStyle]}>
                        <Animated.View style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}>
                            <Text style={styles.overlayEmoji}>❤️</Text>
                        </Animated.View>
                        <Animated.View style={[styles.overlay, styles.nopeOverlay, nopeOverlayStyle]}>
                            <Text style={styles.overlayEmoji}>✖️</Text>
                        </Animated.View>
                        <Text style={styles.cardText} adjustsFontSizeToFit numberOfLines={4}>{current.label}</Text>
                    </Animated.View>
                </GestureDetector>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.circleBtn, styles.nopeBtn]}
                    onPress={() => swipeByButton(false)}
                    accessibilityRole="button"
                    accessibilityLabel={t('tools.match.btn_pass', 'Geç')}
                >
                    <Ionicons name="close" size={34} color={theme.colors.error} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.circleBtn, styles.likeBtn]}
                    onPress={() => swipeByButton(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('tools.match.btn_like', 'Beğen')}
                >
                    <Ionicons name="heart" size={32} color={theme.colors.success} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, alignItems: 'center' },
        progress: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: theme.spacing.md },
        deckArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
        card: {
            position: 'absolute',
            width: '86%',
            height: '88%',
            maxHeight: 420,
            borderRadius: theme.borderRadius.xl,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.surfaceBorder,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
            ...theme.colors.cardShadow,
        },
        cardBehind: { backgroundColor: theme.colors.modalSheet },
        cardText: { color: theme.colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 36 },
        overlay: {
            position: 'absolute',
            top: 20,
            borderRadius: theme.borderRadius.md,
            padding: 8,
        },
        likeOverlay: { left: 20 },
        nopeOverlay: { right: 20 },
        overlayEmoji: { fontSize: 40 },
        buttonRow: { flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
        circleBtn: {
            width: 64, height: 64, borderRadius: 32,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.colors.surface,
            borderWidth: 1.5,
        },
        nopeBtn: { borderColor: theme.colors.error },
        likeBtn: { borderColor: theme.colors.success },
    });
}
