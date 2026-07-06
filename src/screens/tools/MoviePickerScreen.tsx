import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PickEngine } from '../../core/PickEngine';
import { MatchEngine, MatchItem } from '../../core/MatchEngine';
import { LocalStorage } from '../../storage/local';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { ModernButton } from '../../components/ModernButton';
import { MatchFlow } from '../../components/MatchFlow';
import MOVIES_DATA from '../../content/movies.json';

type Mode = 'random' | 'together';
type MatchSource = 'all' | 'mylist' | 'classics' | 'trending' | 'action' | 'comedy' | 'horror' | 'scifi' | 'romance' | 'animation';
type MatchPhase = 'setup' | 'playing';

const GENRES = ['action', 'comedy', 'horror', 'scifi', 'romance', 'animation'] as const;

export default function MoviePickerScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [movies, setMovies] = useState<string[]>([]);
    const [newMovie, setNewMovie] = useState('');

    // Birlikte Seç (eşleştirme) modu durumu
    const [mode, setMode] = useState<Mode>('random');
    const [matchPhase, setMatchPhase] = useState<MatchPhase>('setup');
    const [matchSource, setMatchSource] = useState<MatchSource>('all');
    const [deck, setDeck] = useState<MatchItem[]>([]);
    const [deckVersion, setDeckVersion] = useState(0);

    useEffect(() => {
        LocalStorage.getItem('movieOptions').then((data: any) => {
            if (data) setMovies(data);
        });
    }, []);

    const saveOptions = (newOpts: any) => {
        setMovies(newOpts);
        LocalStorage.setItem('movieOptions', newOpts);
    };

    const addOption = () => {
        if (!newMovie.trim()) return;
        const newOpts = [...movies, newMovie.trim()];
        saveOptions(newOpts);
        setNewMovie('');
    };

    const removeOption = (index: number) => {
        const newOpts = movies.filter((_, i) => i !== index);
        saveOptions(newOpts);
    };

    const moviesData = MOVIES_DATA as Record<string, string[]>;

    const addPredefinedList = (list: string[]) => {
        const newOpts = Array.from(new Set([...movies, ...list]));
        saveOptions(newOpts);
    };

    const handlePick = () => {
        if (movies.length === 0) return;
        const result = PickEngine.pickMovie(movies);
        navigation.navigate('Result', { result, type: 'movie', sourceRoute: 'MoviePicker' });
    };

    const getSourcePool = (source: MatchSource): string[] => {
        if (source === 'mylist') return movies;
        if (source === 'all') return Object.values(moviesData).flat();
        return moviesData[source] ?? [];
    };

    const startMatch = (source: MatchSource) => {
        const pool = getSourcePool(source);
        if (pool.length === 0) return;
        setDeck(MatchEngine.buildDeck(pool));
        setDeckVersion(v => v + 1);
        setMatchPhase('playing');
    };

    const MATCH_SOURCES: { key: MatchSource; label: string }[] = [
        { key: 'all', label: t('tools.match.source_all', 'Hepsi') },
        ...(movies.length > 0 ? [{ key: 'mylist' as MatchSource, label: t('tools.match.source_mylist', 'Benim Listem') }] : []),
        { key: 'classics', label: t('tools.movie.classics') },
        { key: 'trending', label: t('tools.movie.trending') },
        ...GENRES.map(g => ({ key: g as MatchSource, label: t(`tools.movie.genre_${g}`, g) })),
    ];

    const renderModeTabs = () => (
        <View style={styles.tabRow}>
            {(['random', 'together'] as Mode[]).map(m => (
                <TouchableOpacity
                    key={m}
                    style={[styles.tabBtn, mode === m && styles.tabBtnActive]}
                    onPress={() => { setMode(m); setMatchPhase('setup'); }}
                    accessibilityRole="button"
                >
                    <Ionicons
                        name={m === 'random' ? 'shuffle-outline' : 'people-outline'}
                        size={15}
                        color={mode === m ? '#fff' : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                        {m === 'random' ? t('tools.match.mode_random', 'Rastgele') : t('tools.match.mode_together', 'Birlikte Seç')}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderTogetherSetup = () => (
        <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>
            <GlassCard style={styles.setupCard}>
                <Ionicons name="people-outline" size={48} color={theme.colors.primary} />
                <Text style={styles.setupTitle}>{t('tools.match.setup_title', 'Birlikte Seç')}</Text>
                <Text style={styles.setupSub}>{t('tools.match.setup_sub', 'İkiniz de aynı desteyi kaydırın; ortak beğendiğiniz ilk film kazanır.')}</Text>
            </GlassCard>

            <Text style={styles.sourceLabel}>{t('tools.match.pick_genre', 'Tür seç (opsiyonel)')}</Text>
            <View style={styles.sourceGrid}>
                {MATCH_SOURCES.map(s => {
                    const isActive = matchSource === s.key;
                    return (
                        <TouchableOpacity
                            key={s.key}
                            style={[styles.sourceChip, isActive && styles.sourceChipActive]}
                            onPress={() => setMatchSource(s.key)}
                            accessibilityRole="button"
                        >
                            <Text style={[styles.sourceChipText, isActive && styles.sourceChipTextActive]}>{s.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ModernButton
                title={t('tools.match.start', 'Başla')}
                onPress={() => startMatch(matchSource)}
                variant="primary"
                style={styles.startBtn}
            />
        </ScrollView>
    );

    const renderRandomMode = () => (
        <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddScroll} contentContainerStyle={styles.quickAddContainer}>
                <TouchableOpacity style={styles.quickAddBtn} onPress={() => addPredefinedList(moviesData.classics)}>
                    <Text style={styles.quickAddText}>{t('tools.movie.classics')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAddBtn} onPress={() => addPredefinedList(moviesData.trending)}>
                    <Text style={styles.quickAddText}>{t('tools.movie.trending')}</Text>
                </TouchableOpacity>
                {GENRES.map(genre => (
                    <TouchableOpacity key={genre} style={styles.quickAddBtn} onPress={() => addPredefinedList(moviesData[genre])}>
                        <Text style={styles.quickAddText}>{t(`tools.movie.genre_${genre}`, genre)}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.quickAddBtn, styles.clearBtn]} onPress={() => saveOptions([])}>
                    <Text style={styles.quickAddText}>{t('tools.common.clear', 'Temizle')}</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.inputSection}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder={t('tools.movie.placeholder')}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={newMovie}
                        onChangeText={setNewMovie}
                        onSubmitEditing={addOption}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={addOption} accessibilityLabel={t('tools.movie.add_movie')} accessibilityRole="button">
                        <Ionicons name="add" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={movies}
                keyExtractor={(item, index) => index.toString()}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                    <GlassCard style={styles.listItem}>
                        <Text style={styles.listText}>{item}</Text>
                        <TouchableOpacity onPress={() => removeOption(index)} accessibilityLabel={t('tools.wheel.delete')} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                    </GlassCard>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="videocam-outline" size={60} color={theme.colors.surfaceBorder} />
                        <Text style={styles.emptyText}>{t('tools.movie.empty')}</Text>
                    </View>
                }
            />

            <View style={styles.footer}>
                <ModernButton
                    title={t('tools.movie.pick')}
                    onPress={handlePick}
                    disabled={movies.length === 0}
                    variant="primary"
                    style={styles.pickBtn}
                />
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('tools.movie.title')}</Text>
                    <View style={{ width: 44 }} />
                </View>

                {renderModeTabs()}

                {mode === 'random' ? (
                    renderRandomMode()
                ) : matchPhase === 'setup' ? (
                    renderTogetherSetup()
                ) : (
                    <MatchFlow
                        key={deckVersion}
                        deck={deck}
                        resultI18nKey="tools.match.result_movie"
                        onRetry={() => startMatch(matchSource)}
                        onChangeSource={() => setMatchPhase('setup')}
                    />
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, letterSpacing: 1 },

    tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 4, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9, minHeight: 44 },
    tabBtnActive: { backgroundColor: theme.colors.primary },
    tabText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 13 },
    tabTextActive: { color: '#fff' },

    setupScroll: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl },
    setupCard: { alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
    setupTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '900' },
    setupSub: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    sourceLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: theme.spacing.sm },
    sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.lg },
    sourceChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.surfaceBorder, backgroundColor: theme.colors.surface, minHeight: 40 },
    sourceChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    sourceChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    sourceChipTextActive: { color: '#fff' },
    startBtn: { width: '100%' },

    quickAddScroll: { marginBottom: theme.spacing.md, flexGrow: 0 },
    quickAddContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: 8 },
    quickAddBtn: { backgroundColor: theme.colors.surface, paddingVertical: 10, paddingHorizontal: 14, borderRadius: theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    clearBtn: { borderColor: 'rgba(239, 68, 68, 0.3)' },
    quickAddText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
    inputSection: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
    inputContainer: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder, fontSize: 16 },
    addBtn: { backgroundColor: theme.colors.success, width: 56, height: 56, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    list: { flex: 1 },
    listContent: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderRadius: theme.borderRadius.md },
    listText: { fontSize: 16, color: theme.colors.text, fontWeight: '600', flex: 1, marginRight: theme.spacing.md },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: theme.colors.textSecondary, marginTop: theme.spacing.md, fontWeight: '500' },
    footer: { padding: theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.xl },
    pickBtn: { width: '100%' }
    });
}
