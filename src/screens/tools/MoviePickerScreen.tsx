import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Platform, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
type Genre = 'action' | 'comedy' | 'drama' | 'thriller' | 'horror' | 'scifi' | 'romance' | 'animation';
type MatchSource = 'all' | 'mylist' | 'classics' | 'trending' | Genre;
type MatchPhase = 'setup' | 'playing';

const GENRES: Genre[] = ['action', 'comedy', 'drama', 'thriller', 'horror', 'scifi', 'romance', 'animation'];

// Hazır paketler: hızlı ekleme çipleri bu sırayla çıkar
const PACK_KEYS: string[] = ['classics', 'trending', ...GENRES];

// Bir başlığın hazır paketten mi yoksa kullanıcıdan mı geldiğini ayırt etmek
// için tüm paket başlıklarının düz kümesi. Kullanıcının kendi eklediklerini
// korurken paket filmlerini toplu silmeyi mümkün kılar.
const PACK_TITLES = new Set(Object.values(MOVIES_DATA as Record<string, string[]>).flat());

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

    // Hazır paket çipleri AÇ/KAPA çalışır: paket zaten listedeyse tekrar
    // basmak onu kaldırır. (Eskiden yalnızca ekliyordu; ikinci dokunuş Set
    // ile eleniyor ve ekranda hiçbir şey olmuyormuş gibi görünüyordu.)
    const isPackLoaded = (packKey: string) => {
        const list = moviesData[packKey] ?? [];
        if (list.length === 0) return false;
        const current = new Set(movies);
        return list.every(title => current.has(title));
    };

    const togglePack = (packKey: string) => {
        const list = moviesData[packKey] ?? [];
        if (list.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (isPackLoaded(packKey)) {
            const remove = new Set(list);
            saveOptions(movies.filter(title => !remove.has(title)));
        } else {
            saveOptions(Array.from(new Set([...movies, ...list])));
        }
    };

    // Hazır listelerden gelenleri toplu sil — kullanıcının kendi ekledikleri kalır
    const packCount = movies.filter(title => PACK_TITLES.has(title)).length;

    const removePackTitles = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        saveOptions(movies.filter(title => !PACK_TITLES.has(title)));
    };

    const clearAll = () => {
        Alert.alert(
            t('tools.movie.clear_confirm_title', 'Tüm listeyi sil'),
            t('tools.movie.clear_confirm_msg', 'Kendi eklediklerin dahil her şey silinecek.'),
            [
                { text: t('common.cancel', 'İptal'), style: 'cancel' },
                { text: t('tools.movie.clear_all', 'Tümünü sil'), style: 'destructive', onPress: () => saveOptions([]) },
            ]
        );
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
                {PACK_KEYS.map(packKey => {
                    const loaded = isPackLoaded(packKey);
                    const label = packKey === 'classics'
                        ? t('tools.movie.classics')
                        : packKey === 'trending'
                            ? t('tools.movie.trending')
                            : t(`tools.movie.genre_${packKey}`, packKey);
                    return (
                        <TouchableOpacity
                            key={packKey}
                            style={[styles.quickAddBtn, loaded && styles.quickAddBtnActive]}
                            onPress={() => togglePack(packKey)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityState={{ selected: loaded }}
                            accessibilityLabel={label}
                        >
                            <Ionicons
                                name={loaded ? 'checkmark-circle' : 'add-circle-outline'}
                                size={14}
                                color={loaded ? '#fff' : theme.colors.textSecondary}
                            />
                            <Text style={[styles.quickAddText, loaded && styles.quickAddTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Liste yönetimi: hazır paketten gelenleri kendi eklediklerine
                dokunmadan toplu sil, ya da her şeyi temizle */}
            {movies.length > 0 && (
                <View style={styles.manageRow}>
                    <Text style={styles.manageInfo} numberOfLines={1}>
                        {packCount > 0
                            ? t('tools.movie.packs_loaded', { count: packCount, defaultValue: 'Hazır listelerden {{count}} film' })
                            : t('tools.movie.own_only', 'Sadece senin eklediklerin')}
                    </Text>
                    {packCount > 0 && (
                        <TouchableOpacity
                            style={styles.manageBtn}
                            onPress={removePackTitles}
                            accessibilityRole="button"
                            accessibilityLabel={t('tools.movie.remove_packs', 'Hazır listeleri kaldır')}
                        >
                            <Ionicons name="layers-outline" size={14} color={theme.colors.primary} />
                            <Text style={styles.manageBtnText}>{t('tools.movie.remove_packs', 'Hazır listeleri kaldır')}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.manageBtn, styles.manageBtnDanger]}
                        onPress={clearAll}
                        accessibilityRole="button"
                        accessibilityLabel={t('tools.movie.clear_all', 'Tümünü sil')}
                    >
                        <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                        <Text style={[styles.manageBtnText, { color: theme.colors.error }]}>
                            {t('tools.movie.clear_all', 'Tümünü sil')}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

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
    quickAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: theme.colors.surface, paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: theme.borderRadius.md, minHeight: 44,
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    },
    quickAddBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    quickAddText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
    quickAddTextActive: { color: '#fff' },

    manageRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md,
    },
    manageInfo: { width: '100%', color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
    manageBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 8, minHeight: 36,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
        backgroundColor: theme.colors.surface,
    },
    manageBtnDanger: { borderColor: 'rgba(239, 68, 68, 0.35)' },
    manageBtnText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
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
