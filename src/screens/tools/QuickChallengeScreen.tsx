import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../store/ThemeContext';
import { celebrateWinner } from '../../core/celebrate';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import ALL_CHALLENGES from '../../content/challenges.json';

type ChallengeCategory = 'home' | 'sport' | 'social' | 'productivity' | 'fun';
type Difficulty = 'easy' | 'medium' | 'hard';

interface ChallengeItem {
    tr: string;
    en: string;
    category: ChallengeCategory;
    difficulty: Difficulty;
    duration: number;
}

const CHALLENGES = ALL_CHALLENGES as ChallengeItem[];

const CATEGORY_META: Record<ChallengeCategory, { icon: string; color: string }> = {
    home:         { icon: 'home-outline',         color: '#FF9F43' },
    sport:        { icon: 'barbell-outline',       color: '#FF6B6B' },
    social:       { icon: 'people-outline',        color: '#6366F1' },
    productivity: { icon: 'flash-outline',         color: '#FFD166' },
    fun:          { icon: 'happy-outline',         color: '#4ECDC4' },
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
    easy:   '#4ECDC4',
    medium: '#FFD166',
    hard:   '#FF6B6B',
};

const STREAK_KEY = '@challenge_streak_v1';

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

export default function QuickChallengeScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en';

    const [filterCategory, setFilterCategory] = useState<ChallengeCategory | 'all'>('all');
    const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
    const [challenge, setChallenge] = useState<ChallengeItem | null>(null);
    const [displayedText, setDisplayedText] = useState(t('tools.challenge.placeholder'));
    const [displayedCategory, setDisplayedCategory] = useState<ChallengeCategory | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [streak, setStreak] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [timerLeft, setTimerLeft] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const seenRef = useRef<Set<number>>(new Set());

    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const cardScale = useRef(new Animated.Value(1)).current;

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
        try { await AsyncStorage.setItem(STREAK_KEY, JSON.stringify({ date: todayKey(), count: next })); } catch {}
    };

    const getPool = useCallback((): { items: ChallengeItem[]; indices: number[] } => {
        const indices = CHALLENGES.reduce<number[]>((acc, c, i) => {
            const catMatch = filterCategory === 'all' || c.category === filterCategory;
            const diffMatch = filterDifficulty === 'all' || c.difficulty === filterDifficulty;
            if (catMatch && diffMatch) acc.push(i);
            return acc;
        }, []);
        return { items: indices.map(i => CHALLENGES[i]), indices };
    }, [filterCategory, filterDifficulty]);

    const pickUnseen = useCallback((indices: number[]): number => {
        const unseen = indices.filter(i => !seenRef.current.has(i));
        if (unseen.length === 0) {
            seenRef.current = new Set();
            return indices[Math.floor(Math.random() * indices.length)];
        }
        return unseen[Math.floor(Math.random() * unseen.length)];
    }, []);

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

    const runSlotAnimation = (final: ChallengeItem) => {
        let counter = 0;
        const interval = setInterval(() => {
            counter++;
            const rnd = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
            setDisplayedText(rnd[lang]);
            setDisplayedCategory(rnd.category);
            Animated.sequence([
                Animated.timing(translateY, { toValue: -10, duration: 32, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 10, duration: 32, useNativeDriver: true }),
            ]).start();
            if (counter >= 14) {
                clearInterval(interval);
                Animated.parallel([
                    Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
                    Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
                ]).start();
                setChallenge(final);
                setDisplayedText(final[lang]);
                setDisplayedCategory(final.category);
                setIsShuffling(false);
                celebrateWinner();
            }
        }, 65);
    };

    const generateChallenge = () => {
        stopTimer();
        setIsShuffling(true);
        setChallenge(null);
        opacity.setValue(0.5);
        cardScale.setValue(0.97);

        const { indices } = getPool();
        if (indices.length === 0) {
            setDisplayedText(t('tools.challenge.no_match'));
            setIsShuffling(false);
            return;
        }
        const idx = pickUnseen(indices);
        seenRef.current.add(idx);
        runSlotAnimation(CHALLENGES[idx]);
    };

    const handleDone = async () => {
        await incrementStreak();
        // Kutlama ResultScreen'de tek noktadan verilir
        navigation.navigate('Result', { result: challenge?.[lang], type: 'challenge' });
    };

    const catMeta = displayedCategory ? CATEGORY_META[displayedCategory] : null;
    const diffColor = challenge ? DIFFICULTY_COLOR[challenge.difficulty] : null;

    const CATEGORIES: (ChallengeCategory | 'all')[] = ['all', 'home', 'sport', 'social', 'productivity', 'fun'];
    const DIFFICULTIES: (Difficulty | 'all')[] = ['all', 'easy', 'medium', 'hard'];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
                        <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>{t('tools.challenge.title')}</Text>
                        <Text style={styles.subtitle}>{t('tools.challenge.subtitle')}</Text>
                    </View>
                    <View style={styles.streakBadge}>
                        <Text style={styles.streakNum}>{streak}</Text>
                        <Text style={styles.streakLabel}>{t('tools.challenge.streak_label')}</Text>
                    </View>
                </View>

                {/* Category filter */}
                <Text style={styles.filterLabel}>{t('tools.challenge.filter_category')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {CATEGORIES.map(cat => {
                        const isActive = filterCategory === cat;
                        const meta = cat !== 'all' ? CATEGORY_META[cat] : null;
                        const color = meta?.color ?? theme.colors.primary;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
                                onPress={() => { setFilterCategory(cat); setChallenge(null); seenRef.current = new Set(); }}
                            >
                                {meta && <Ionicons name={meta.icon as any} size={13} color={isActive ? '#fff' : color} />}
                                <Text style={[styles.chipText, isActive && styles.chipTextActive, !isActive && { color }]}>
                                    {cat === 'all' ? t('tools.challenge.cat_all') : t(`tools.challenge.categories.${cat}`)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Difficulty filter */}
                <Text style={[styles.filterLabel, { marginTop: 4 }]}>{t('tools.challenge.filter_difficulty')}</Text>
                <View style={styles.diffRow}>
                    {DIFFICULTIES.map(diff => {
                        const isActive = filterDifficulty === diff;
                        const color = diff !== 'all' ? DIFFICULTY_COLOR[diff] : theme.colors.primary;
                        return (
                            <TouchableOpacity
                                key={diff}
                                style={[styles.diffChip, isActive && { backgroundColor: color, borderColor: color }]}
                                onPress={() => { setFilterDifficulty(diff); setChallenge(null); seenRef.current = new Set(); }}
                            >
                                <Text style={[styles.chipText, isActive && styles.chipTextActive, !isActive && { color }]}>
                                    {diff === 'all' ? t('tools.challenge.diff_all') : t(`tools.challenge.difficulties.${diff}`)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Challenge card */}
                <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <GlassCard style={[styles.card, catMeta ? { borderColor: catMeta.color + '40' } : null] as any}>
                        {/* Category + difficulty chips */}
                        <View style={styles.cardChipsRow}>
                            {catMeta && displayedCategory && (
                                <View style={[styles.categoryChip, { backgroundColor: catMeta.color + '20' }]}>
                                    <Ionicons name={catMeta.icon as any} size={13} color={catMeta.color} />
                                    <Text style={[styles.categoryText, { color: catMeta.color }]}>
                                        {t(`tools.challenge.categories.${displayedCategory}`)}
                                    </Text>
                                </View>
                            )}
                            {challenge && diffColor && (
                                <View style={[styles.diffBadge, { backgroundColor: diffColor + '25', borderColor: diffColor + '60' }]}>
                                    <Text style={[styles.diffBadgeText, { color: diffColor }]}>
                                        {t(`tools.challenge.difficulties.${challenge.difficulty}`)}
                                    </Text>
                                </View>
                            )}
                        </View>

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
                                            {timerLeft >= 60
                                                ? `${Math.floor(timerLeft / 60)}:${String(timerLeft % 60).padStart(2, '0')}`
                                                : `${timerLeft}s`}
                                        </Text>
                                        <TouchableOpacity onPress={stopTimer} style={styles.timerStop}>
                                            <Ionicons name="stop-circle-outline" size={20} color={theme.colors.textSecondary} />
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

                {/* Timer start button */}
                {challenge && !isShuffling && challenge.duration > 0 && !timerActive && timerLeft === 0 && (
                    <TouchableOpacity
                        style={[styles.timerBtn, { borderColor: catMeta?.color ?? theme.colors.primary }]}
                        onPress={() => startTimer(challenge.duration)}
                    >
                        <Ionicons name="timer-outline" size={18} color={catMeta?.color ?? theme.colors.primary} />
                        <Text style={[styles.timerBtnText, { color: catMeta?.color ?? theme.colors.primary }]}>
                            {t('tools.challenge.timer_start')} ({challenge.duration >= 60
                                ? `${Math.floor(challenge.duration / 60)} dk`
                                : `${challenge.duration}s`})
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Generate */}
                <TouchableOpacity style={[styles.generateBtn, isShuffling && { opacity: 0.6 }]} onPress={generateChallenge} disabled={isShuffling} activeOpacity={0.85}>
                    <Ionicons name="shuffle-outline" size={20} color="#fff" />
                    <Text style={styles.generateBtnText}>{t('tools.challenge.generate')}</Text>
                </TouchableOpacity>

                {/* Feedback */}
                {challenge && !isShuffling && (
                    <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackLabel}>{t('tools.challenge.feedback_label')}</Text>
                        <View style={styles.feedbackBtns}>
                            <TouchableOpacity style={[styles.fBtn, styles.fBtnYes]} onPress={handleDone}>
                                <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                <Text style={styles.fBtnText}>{t('tools.challenge.feedback_yes')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.fBtn, styles.fBtnSkip]} onPress={generateChallenge}>
                                <Ionicons name="play-skip-forward" size={20} color="#FFF" />
                                <Text style={styles.fBtnText}>{t('tools.challenge.feedback_no')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 4 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
    title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
    subtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 3, textAlign: 'center' },
    streakBadge: { width: 44, alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' },
    streakNum: { fontSize: 18, fontWeight: '900', color: theme.colors.primary },
    streakLabel: { fontSize: 9, color: theme.colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },

    filterLabel: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
    chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4, marginBottom: 10 },
    diffRow: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.surfaceBorder, backgroundColor: theme.colors.surface },
    diffChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.surfaceBorder, backgroundColor: theme.colors.surface },
    chipText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
    chipTextActive: { color: '#fff' },

    card: { minHeight: 180, justifyContent: 'center', alignItems: 'center', padding: 24, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.surfaceBorder, gap: 12 },
    cardChipsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
    categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    categoryText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    diffBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    challengeText: { fontSize: 24, color: theme.colors.text, textAlign: 'center', fontWeight: '800', lineHeight: 32 },
    shufflingText: { color: '#FF9500', opacity: 0.8 },

    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    timerNum: { fontSize: 32, fontWeight: '900', color: theme.colors.primary },
    timerNumUrgent: { color: '#FF6B6B' },
    timerStop: { padding: 4 },
    timerDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timerDoneText: { color: theme.colors.success, fontWeight: '700', fontSize: 14 },

    timerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 12 },
    timerBtnText: { fontWeight: '700', fontSize: 14 },

    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, padding: 17, borderRadius: 16, marginBottom: 20, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
    generateBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

    feedbackContainer: { alignItems: 'center', marginBottom: 24 },
    feedbackLabel: { color: theme.colors.textSecondary, marginBottom: 12, fontSize: 14 },
    feedbackBtns: { flexDirection: 'row', gap: 14 },
    fBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 14, gap: 7, minWidth: 100, justifyContent: 'center' },
    fBtnYes: { backgroundColor: theme.colors.success },
    fBtnSkip: { backgroundColor: '#FF9500' },
    fBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    });
}
