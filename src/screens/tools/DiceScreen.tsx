import React, { useMemo, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { PickEngine } from '../../core/PickEngine';
import DiceFace from '../../components/DiceFace';
import { useTheme } from '../../store/ThemeContext';
import { celebrateWinner } from '../../core/celebrate';
import { AppTheme } from '../../core/Theme';
import SoundManager from '../../core/SoundManager';
import { trackResult, maybeRequestReview } from '../../core/ReviewManager';

export default function DiceScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [diceCount, setDiceCount] = useState<1 | 2>(2);
    const [results, setResults] = useState<number[]>([]);
    const [isRolling, setIsRolling] = useState(false);
    const [rollKey, setRollKey] = useState(0);

    const translateX = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const totalSum = results.reduce((a, b) => a + b, 0);

    const handleRoll = () => {
        if (isRolling) return;
        setIsRolling(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const newResults = PickEngine.rollDice(diceCount, 6);

        const spinLoop = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 900,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        const shakeLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, { toValue: -7, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 7, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(translateX, { toValue: -4, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 4, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 0, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        );
        spinLoop.start();
        shakeLoop.start();

        SoundManager.play('dice-roll');

        setTimeout(() => {
            spinLoop.stop();
            shakeLoop.stop();
            rotateAnim.setValue(0);
            translateX.setValue(0);
            // Davul sesi (~6 sn) animasyondan uzun; zarlar durunca kes ki
            // winner sesiyle üst üste binmesin.
            SoundManager.stop('dice-roll');
            setResults(newResults);
            setRollKey(k => k + 1);
            setIsRolling(false);
            celebrateWinner();
            trackResult().then(maybeRequestReview).catch(() => {});
        }, 3800);
    };

    const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessibilityLabel="Geri"
                    accessibilityRole="button"
                >
                    <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('tools.dice.title')}</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.topInfo}>
                <Text style={styles.instruction}>{t('tools.dice.tap_to_roll')}</Text>
                {results.length > 0 && (
                    <MotiView
                        key={`sum-${rollKey}`}
                        from={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    >
                        <Text style={styles.sumText}>{totalSum}</Text>
                    </MotiView>
                )}
            </View>

            <View style={styles.diceArea}>
                <Animated.View style={[
                    styles.diceRow,
                    { transform: [{ translateX }, { rotate: rotation }] }
                ]}>
                    {(results.length > 0 ? results : Array(diceCount).fill(1)).map((val, idx) => (
                        <MotiView
                            key={`${idx}-${rollKey}`}
                            from={results.length > 0 ? { scale: 1.25, opacity: 0 } : { scale: 1, opacity: 1 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 15, delay: idx * 60 }}
                        >
                            <DiceFace value={val} size={diceCount === 1 ? 140 : 110} />
                        </MotiView>
                    ))}
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <View style={styles.countSelector}>
                    {([1, 2] as const).map(n => (
                        <TouchableOpacity
                            key={n}
                            style={[styles.countBtn, diceCount === n && styles.countBtnActive]}
                            onPress={() => setDiceCount(n)}
                            accessibilityLabel={n === 1 ? t('tools.dice.one_dice') : t('tools.dice.two_dice')}
                            accessibilityRole="button"
                        >
                            <Text style={[styles.countBtnText, diceCount === n && styles.countBtnTextActive]}>
                                {n === 1 ? t('tools.dice.one_dice') : t('tools.dice.two_dice')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.rollBtn, isRolling && styles.rollBtnDisabled]}
                    onPress={handleRoll}
                    disabled={isRolling}
                    accessibilityLabel={t('tools.dice.roll')}
                    accessibilityRole="button"
                >
                    <Ionicons name="dice" size={34} color="#FFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.surface,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    },
    title: { fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: 0.5 },
    topInfo: { alignItems: 'center', paddingTop: theme.spacing.md },
    instruction: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    sumText: {
        color: theme.colors.text,
        fontSize: 72,
        fontWeight: '900',
        lineHeight: 80,
    },
    diceArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    diceRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.lg,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: theme.spacing.xxl,
        gap: theme.spacing.lg,
    },
    countSelector: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.surfaceBorder,
    },
    countBtn: {
        paddingVertical: 10,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
    },
    countBtnActive: { backgroundColor: theme.colors.primary },
    countBtnText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 14 },
    countBtnTextActive: { color: '#fff' },
    rollBtn: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.success,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    rollBtnDisabled: { opacity: 0.5 },
    });
}
