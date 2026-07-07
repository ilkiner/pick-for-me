import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../store/ThemeContext';
import { celebrateWinner } from '../../core/celebrate';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { ContentCategory, getContextualWeights, weightedRandomCategory } from '../../core/context';
import IDEAS_DATA from '../../content/ideas.json';

type IdeaCategory = 'all' | ContentCategory;
type TabMode = 'app' | 'favorites';

interface IdeaItem { tr: string; en: string; }

const IDEAS = IDEAS_DATA as Record<ContentCategory, IdeaItem[]>;

const CATEGORY_META: Record<ContentCategory, { icon: string; color: string; labelKey: string }> = {
    food:     { icon: 'restaurant-outline', color: '#FF6B6B', labelKey: 'food' },
    activity: { icon: 'flash-outline',      color: '#6366F1', labelKey: 'activity' },
    place:    { icon: 'location-outline',   color: '#4ECDC4', labelKey: 'place' },
    gift:     { icon: 'gift-outline',       color: '#FFD166', labelKey: 'gift' },
};

const FAVORITES_KEY = '@idea_favorites_v1';
const SLOT_TICK_MS = 70;
const SLOT_TICKS = 14;

export default function IdeaGeneratorScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en';

    const [tab, setTab] = useState<TabMode>('app');
    const [category, setCategory] = useState<IdeaCategory>('all');
    const [currentIdea, setCurrentIdea] = useState<IdeaItem | null>(null);
    const [displayedText, setDisplayedText] = useState(t('tools.idea.placeholder'));
    const [isShuffling, setIsShuffling] = useState(false);
    const [favorites, setFavorites] = useState<IdeaItem[]>([]);
    const [isFav, setIsFav] = useState(false);

    // Repeat prevention: track seen indices per category key
    const seenRef = useRef<Map<string, Set<number>>>(new Map());

    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => { loadFavorites(); }, []);

    const loadFavorites = async () => {
        try {
            const raw = await AsyncStorage.getItem(FAVORITES_KEY);
            if (raw) setFavorites(JSON.parse(raw));
        } catch {}
    };

    const saveFavorites = async (items: IdeaItem[]) => {
        setFavorites(items);
        try { await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(items)); } catch {}
    };

    const toggleFavorite = async () => {
        if (!currentIdea) return;
        const alreadySaved = favorites.some(f => f.tr === currentIdea.tr);
        if (alreadySaved) {
            await saveFavorites(favorites.filter(f => f.tr !== currentIdea.tr));
            setIsFav(false);
        } else {
            await saveFavorites([...favorites, currentIdea]);
            setIsFav(true);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const getPool = useCallback((): IdeaItem[] => {
        if (category === 'all') {
            const weights = getContextualWeights();
            const chosen = weightedRandomCategory(weights);
            return IDEAS[chosen];
        }
        return IDEAS[category as ContentCategory] ?? [];
    }, [category]);

    const pickUnseenItem = useCallback((pool: IdeaItem[], cacheKey: string): IdeaItem => {
        const seen = seenRef.current.get(cacheKey) ?? new Set<number>();
        const unseen = pool.map((_, i) => i).filter(i => !seen.has(i));

        // Reset if all seen
        if (unseen.length === 0) {
            seenRef.current.set(cacheKey, new Set());
            return pool[Math.floor(Math.random() * pool.length)];
        }

        const idx = unseen[Math.floor(Math.random() * unseen.length)];
        seen.add(idx);
        seenRef.current.set(cacheKey, seen);
        return pool[idx];
    }, []);

    const runSlotAnimation = (final: IdeaItem) => {
        const allItems: IdeaItem[] = (Object.values(IDEAS) as IdeaItem[][]).flat();
        let counter = 0;

        const interval = setInterval(() => {
            counter++;
            const rnd = allItems[Math.floor(Math.random() * allItems.length)];
            setDisplayedText(rnd[lang]);

            Animated.sequence([
                Animated.timing(translateY, { toValue: -8, duration: SLOT_TICK_MS / 2, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 8, duration: SLOT_TICK_MS / 2, useNativeDriver: true }),
            ]).start();

            if (counter >= SLOT_TICKS) {
                clearInterval(interval);
                Animated.parallel([
                    Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                ]).start();
                setCurrentIdea(final);
                setDisplayedText(final[lang]);
                setIsFav(favorites.some(f => f.tr === final.tr));
                setIsShuffling(false);
                celebrateWinner();
            }
        }, SLOT_TICK_MS);
    };

    const generateIdea = () => {
        setIsShuffling(true);
        setCurrentIdea(null);
        opacity.setValue(0.5);

        const pool = getPool();
        const cacheKey = category;
        const final = pickUnseenItem(pool, cacheKey);
        runSlotAnimation(final);
    };

    const CATEGORIES: { key: IdeaCategory; label: string; icon?: string; color?: string }[] = [
        { key: 'all',      label: t('tools.idea.cat_all') },
        { key: 'food',     label: t('tools.idea.cat_food'),     icon: CATEGORY_META.food.icon,     color: CATEGORY_META.food.color },
        { key: 'activity', label: t('tools.idea.cat_activity'), icon: CATEGORY_META.activity.icon, color: CATEGORY_META.activity.color },
        { key: 'place',    label: t('tools.idea.cat_place'),    icon: CATEGORY_META.place.icon,    color: CATEGORY_META.place.color },
        { key: 'gift',     label: t('tools.idea.cat_gift'),     icon: CATEGORY_META.gift.icon,     color: CATEGORY_META.gift.color },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
                        <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>{t('tools.idea.title')}</Text>
                        <Text style={styles.subtitle}>{t('tools.idea.subtitle')}</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {/* Tab toggle */}
                <View style={styles.tabRow}>
                    {(['app', 'favorites'] as TabMode[]).map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.tabBtn, tab === m && styles.tabBtnActive]}
                            onPress={() => setTab(m)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: tab === m }}
                            accessibilityLabel={m === 'app' ? t('tools.idea.tab_app') : t('tools.idea.tab_favorites')}
                        >
                            <Ionicons
                                name={m === 'app' ? 'bulb-outline' : 'heart-outline'}
                                size={14}
                                color={tab === m ? '#fff' : theme.colors.textSecondary}
                            />
                            <Text style={[styles.tabText, tab === m && styles.tabTextActive]}>
                                {m === 'app' ? t('tools.idea.tab_app') : t('tools.idea.tab_favorites')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {tab === 'app' ? (
                    <>
                        {/* Category chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                            {CATEGORIES.map(c => {
                                const isActive = category === c.key;
                                const color = c.color ?? theme.colors.primary;
                                return (
                                    <TouchableOpacity
                                        key={c.key}
                                        style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
                                        onPress={() => { setCategory(c.key); setCurrentIdea(null); setDisplayedText(t('tools.idea.placeholder')); }}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: isActive }}
                                        accessibilityLabel={c.label}
                                    >
                                        {c.icon && <Ionicons name={c.icon as any} size={13} color={isActive ? '#fff' : color} />}
                                        <Text style={[styles.chipText, isActive && styles.chipTextActive, !isActive && c.color ? { color } : {}]}>
                                            {c.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Result card */}
                        <GlassCard style={styles.resultCard}>
                            <Animated.View style={{ transform: [{ translateY }], opacity, alignItems: 'center' }}>
                                <Text style={[styles.ideaText, isShuffling && styles.ideaTextShuffling]}>
                                    {displayedText}
                                </Text>
                            </Animated.View>
                        </GlassCard>

                        {/* Generate button */}
                        <TouchableOpacity
                            style={[styles.generateBtn, isShuffling && { opacity: 0.6 }]}
                            onPress={generateIdea}
                            disabled={isShuffling}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel={t('tools.idea.generate')}
                        >
                            <Ionicons name="shuffle-outline" size={20} color="#fff" />
                            <Text style={styles.generateBtnText}>{t('tools.idea.generate')}</Text>
                        </TouchableOpacity>

                        {/* Action row: Save + Another */}
                        {currentIdea && !isShuffling && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSave, isFav && styles.actionBtnSaved]} onPress={toggleFavorite}>
                                    <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#fff' : theme.colors.primary} />
                                    <Text style={[styles.actionBtnText, isFav ? { color: '#fff' } : { color: theme.colors.primary }]}>
                                        {isFav ? t('tools.idea.saved') : t('tools.idea.save')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAnother]} onPress={generateIdea}>
                                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>{t('tools.idea.another')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    /* Favorites tab */
                    <View style={styles.favoritesContainer}>
                        {favorites.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="heart-outline" size={48} color={theme.colors.surfaceBorder} />
                                <Text style={styles.emptyText}>{t('tools.idea.favorites_empty')}</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.favCount}>{favorites.length} {t('tools.idea.favorites_count')}</Text>
                                {favorites.map((item, idx) => (
                                    <GlassCard key={idx} style={styles.favCard}>
                                        <Text style={styles.favText}>{item[lang]}</Text>
                                        <TouchableOpacity
                                            onPress={() => saveFavorites(favorites.filter((_, i) => i !== idx))}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                        </TouchableOpacity>
                                    </GlassCard>
                                ))}
                            </>
                        )}
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

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    headerCenter: { alignItems: 'center', flex: 1 },
    title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
    subtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 3 },

    tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
    tabBtnActive: { backgroundColor: theme.colors.primary },
    tabText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 13 },
    tabTextActive: { color: '#fff' },

    chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4, marginBottom: 18 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.surfaceBorder, backgroundColor: theme.colors.surface },
    chipText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
    chipTextActive: { color: '#fff' },

    resultCard: { minHeight: 160, justifyContent: 'center', alignItems: 'center', padding: 24, marginBottom: 16 },
    ideaText: { fontSize: 24, color: theme.colors.text, textAlign: 'center', fontWeight: '800', lineHeight: 32 },
    ideaTextShuffling: { color: theme.colors.textSecondary, opacity: 0.7 },

    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, padding: 17, borderRadius: 16, marginBottom: 12, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
    generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14 },
    actionBtnSave: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.primary },
    actionBtnSaved: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    actionBtnAnother: { backgroundColor: theme.colors.secondary ?? '#6366F1' },
    actionBtnText: { fontWeight: '800', fontSize: 14 },

    favoritesContainer: { marginTop: 8 },
    favCount: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
    favCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginBottom: 8, borderRadius: 12 },
    favText: { color: theme.colors.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
    emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center' },
    });
}
