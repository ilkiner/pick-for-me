import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';

type Category = 'physical' | 'mindfulness' | 'focus' | 'social' | 'mental' | 'health';

interface Challenge {
    text: string;
    category: Category;
    duration: number; // seconds; 0 = no timer
}

const CATEGORY_META: Record<Category, { icon: string; color: string }> = {
    physical:     { icon: 'barbell-outline',      color: '#FF6B6B' },
    mindfulness:  { icon: 'leaf-outline',          color: '#4ECDC4' },
    focus:        { icon: 'flash-outline',         color: '#FFD166' },
    social:       { icon: 'people-outline',        color: '#6366F1' },
    mental:       { icon: 'bulb-outline',          color: '#A855F7' },
    health:       { icon: 'heart-outline',         color: '#FF9F43' },
};

const STREAK_KEY = '@challenge_streak_v1';

// Returns today's date as YYYY-MM-DD string (for streak tracking)
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

export default function QuickChallengeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const challengesList = t('tools.challenge.list', { returnObjects: true }) as Challenge[];

    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [displayedText, setDisplayedText] = useState(t('tools.challenge.placeholder'));
    const [displayedCategory, setDisplayedCategory] = useState<Category | null>(null);
    const [streak, setStreak] = useState(0);

    // Timer state
    const [timerActive, setTimerActive] = useState(false);
    const [timerLeft, setTimerLeft] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Animation refs
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const cardScale = useRef(new Animated.Value(1)).current;

    // Load streak on mount
    useEffect(() => {
        loadStreak();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const loadStreak = async () => {
        try {
            const raw = await AsyncStorage.getItem(STREAK_KEY);
            if (raw) {
                const { date, count } = JSON.parse(raw);
                if (date === todayKey()) setStreak(count);
            }
        } catch {}
    };

    const incrementStreak = async () => {
        const next = streak + 1;
        setStreak(next);
        try {
            await AsyncStorage.setItem(STREAK_KEY, JSON.stringify({ date: todayKey(), count: next }));
        } catch {}
    };

    // Timer logic
    const startTimer = useCallback((seconds: number) => {
        setTimerLeft(seconds);
        setTimerActive(true);
        timerRef.current = setInterval(() => {
            setTimerLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    setTimerActive(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    return 0;
                }
                if (prev <= 4) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return prev - 1;
            });
        }, 1000);
    }, []);

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerActive(false);
        setTimerLeft(0);
    };

    // Slot machine animation
    const runSlotAnimation = (final: Challenge) => {
        let counter = 0;
        const maxTicks = 14;
        const intervalTime = 65;

        const interval = setInterval(() => {
            counter++;
            const rnd = challengesList[Math.floor(Math.random() * challengesList.length)];
            setDisplayedText(rnd.text);
            setDisplayedCategory(rnd.category);

            Animated.sequence([
                Animated.timing(translateY, { toValue: -10, duration: intervalTime / 2, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 10, duration: intervalTime / 2, useNativeDriver: true }),
            ]).start();

            if (counter >= maxTicks) {
                clearInterval(interval);

                Animated.parallel([
                    Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
                    Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
                ]).start();

                setChallenge(final);
                setDisplayedText(final.text);
                setDisplayedCategory(final.category);
                setIsShuffling(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        }, intervalTime);
    };

    const generateChallenge = () => {
        stopTimer();
        setIsShuffling(true);
        setChallenge(null);
        opacity.setValue(0.5);
        cardScale.setValue(0.97);

        const random = challengesList[Math.floor(Math.random() * challengesList.length)];
        runSlotAnimation(random);
    };

    const handleDone = async () => {
        await incrementStreak();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.navigate('Result', { result: challenge?.text, type: 'challenge' });
    };

    const catMeta = displayedCategory ? CATEGORY_META[displayedCategory] : null;
    const isDone = timerLeft === 0 && !timerActive && challenge?.duration && challenge.duration > 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                        accessibilityLabel="Back"
                        accessibilityRole="button"
                    >
                        <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>{t('tools.challenge.title')}</Text>
                        <Text style={styles.subtitle}>{t('tools.challenge.subtitle')}</Text>
                    </View>

                    {/* Streak badge */}
                    <View style={styles.streakBadge}>
                        <Text style={styles.streakNum}>{streak}</Text>
                        <Text style={styles.streakLabel}>{t('tools.challenge.streak_label')}</Text>
                    </View>
                </View>

                {/* Challenge card */}
                <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <GlassCard style={[
                        styles.card,
                        catMeta ? { borderColor: catMeta.color + '40' } : null,
                    ] as any}>
                        {/* Category chip */}
                        {catMeta && displayedCategory && (
                            <View style={[styles.categoryChip, { backgroundColor: catMeta.color + '20' }]}>
                                <Ionicons name={catMeta.icon as any} size={14} color={catMeta.color} />
                                <Text style={[styles.categoryText, { color: catMeta.color }]}>
                                    {t(`tools.challenge.categories.${displayedCategory}`)}
                                </Text>
                            </View>
                        )}

                        <Animated.View style={{ transform: [{ translateY }], opacity, alignItems: 'center', paddingHorizontal: 8 }}>
                            <Text style={[styles.challengeText, isShuffling && styles.shufflingText]}>
                                {displayedText}
                            </Text>
                        </Animated.View>

                        {/* Timer display */}
                        {(timerActive || (timerLeft === 0 && !timerActive && challenge?.duration && challenge.duration > 0)) && (
                            <View style={styles.timerRow}>
                                {timerActive ? (
                                    <>
                                        <Text style={[styles.timerNum, timerLeft <= 3 && styles.timerNumUrgent]}>
                                            {timerLeft}s
                                        </Text>
                                        <TouchableOpacity onPress={stopTimer} style={styles.timerStop}>
                                            <Ionicons name="stop-circle-outline" size={18} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.timerDoneRow}>
                                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                                        <Text style={styles.timerDoneText}>{t('tools.challenge.timer_done')}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </GlassCard>
                </Animated.View>

                {/* Timer start button (for timed challenges) */}
                {challenge && !isShuffling && challenge.duration > 0 && !timerActive && timerLeft === 0 && (
                    <TouchableOpacity
                        style={[styles.timerBtn, { borderColor: catMeta?.color ?? theme.colors.primary }]}
                        onPress={() => startTimer(challenge.duration)}
                    >
                        <Ionicons name="timer-outline" size={18} color={catMeta?.color ?? theme.colors.primary} />
                        <Text style={[styles.timerBtnText, { color: catMeta?.color ?? theme.colors.primary }]}>
                            {t('tools.challenge.timer_start')} ({challenge.duration}s)
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Generate button */}
                <TouchableOpacity
                    style={[styles.generateBtn, isShuffling && styles.generateBtnDisabled]}
                    onPress={generateChallenge}
                    disabled={isShuffling}
                    activeOpacity={0.85}
                >
                    <Text style={styles.generateBtnText}>{t('tools.challenge.generate')}</Text>
                </TouchableOpacity>

                {/* Feedback */}
                {challenge && !isShuffling && (
                    <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackLabel}>{t('tools.challenge.feedback_label')}</Text>
                        <View style={styles.feedbackBtns}>
                            <TouchableOpacity
                                style={[styles.fBtn, styles.fBtnYes]}
                                onPress={handleDone}
                            >
                                <Ionicons name="checkmark-done" size={22} color="#FFF" />
                                <Text style={styles.fBtnText}>{t('tools.challenge.feedback_yes')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.fBtn, styles.fBtnSkip]}
                                onPress={generateChallenge}
                            >
                                <Ionicons name="play-skip-forward" size={22} color="#FFF" />
                                <Text style={styles.fBtnText}>{t('tools.challenge.feedback_no')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Category legend */}
                <View style={styles.legend}>
                    {(Object.entries(CATEGORY_META) as [Category, { icon: string; color: string }][]).map(([key, meta]) => (
                        <View key={key} style={styles.legendItem}>
                            <Ionicons name={meta.icon as any} size={13} color={meta.color} />
                            <Text style={[styles.legendText, { color: meta.color }]}>
                                {t(`tools.challenge.categories.${key}`)}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28, marginTop: 6,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.surface,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    },
    headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
    title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
    subtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 3, textAlign: 'center' },

    streakBadge: {
        width: 44, alignItems: 'center',
        backgroundColor: 'rgba(99,102,241,0.12)',
        borderRadius: 10, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    },
    streakNum: { fontSize: 18, fontWeight: '900', color: theme.colors.primary },
    streakLabel: { fontSize: 9, color: theme.colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },

    card: {
        minHeight: 200, justifyContent: 'center', alignItems: 'center',
        padding: 28, marginBottom: 16,
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
        gap: theme.spacing.md,
    },

    categoryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 20, alignSelf: 'center',
    },
    categoryText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

    challengeText: {
        fontSize: 26, color: theme.colors.text,
        textAlign: 'center', fontWeight: '800', lineHeight: 34,
    },
    shufflingText: { color: '#FF9500', opacity: 0.8 },

    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    timerNum: { fontSize: 32, fontWeight: '900', color: theme.colors.primary },
    timerNumUrgent: { color: '#FF6B6B' },
    timerStop: { padding: 4 },
    timerDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timerDoneText: { color: theme.colors.success, fontWeight: '700', fontSize: 15 },

    timerBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, borderWidth: 1.5, borderRadius: 12,
        paddingVertical: 12, paddingHorizontal: 20,
        marginBottom: 12,
    },
    timerBtnText: { fontWeight: '700', fontSize: 14 },

    generateBtn: {
        backgroundColor: theme.colors.primary,
        padding: 18, borderRadius: 16,
        alignItems: 'center', marginBottom: 24,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 12,
        elevation: 6,
    },
    generateBtnDisabled: { opacity: 0.6 },
    generateBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

    feedbackContainer: { alignItems: 'center', marginBottom: 28 },
    feedbackLabel: { color: theme.colors.textSecondary, marginBottom: 14, fontSize: 15 },
    feedbackBtns: { flexDirection: 'row', gap: 16 },
    fBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 20,
        borderRadius: 14, gap: 8, minWidth: 110, justifyContent: 'center',
    },
    fBtnYes: { backgroundColor: theme.colors.success },
    fBtnSkip: { backgroundColor: '#FF9500' },
    fBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

    legend: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: 10, justifyContent: 'center',
        paddingTop: 8,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendText: { fontSize: 11, fontWeight: '600' },
    });
}
