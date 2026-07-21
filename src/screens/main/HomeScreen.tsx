import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '../../components/GlassCard';
import { DailyChallengeCard } from '../../components/DailyChallengeCard';
import { BannerAdView } from '../../components/BannerAdView';
import { AdManager } from '../../core/AdManager';
import { usePro } from '../../store/ProContext';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { trackToolVisit, getRecentToolIds, toggleFavoriteTool, getFavoriteToolIds } from '../../core/toolPreferences';
import { track } from '../../core/Analytics';

const { width } = Dimensions.get('window');

type ToolItem = { id: string; key: string; iconLib: any; iconName: string; route: string; color: (t: AppTheme) => string; desc: string };

const TOOL_DEFS: ToolItem[] = [
    { id: '1',  key: 'wheel',      iconLib: MaterialCommunityIcons, iconName: 'steering',    route: 'WheelOfFortune', color: t => t.colors.secondary, desc: 'spin' },
    { id: '2',  key: 'dice',       iconLib: FontAwesome5,            iconName: 'dice',        route: 'Dice',           color: t => t.colors.error,     desc: 'roll' },
    { id: '3',  key: 'coin',       iconLib: FontAwesome5,            iconName: 'coins',       route: 'CoinFlip',       color: t => t.colors.accent,    desc: 'flip' },
    { id: '4',  key: 'color',      iconLib: Ionicons,                iconName: 'color-palette', route: 'ColorPicker',  color: () => '#AF52DE',         desc: 'color' },
    { id: '5',  key: 'idea',       iconLib: FontAwesome5,            iconName: 'lightbulb',   route: 'IdeaGenerator',  color: () => '#FFD60A',         desc: 'idea' },
    { id: '6',  key: 'challenge',  iconLib: Ionicons,                iconName: 'flash',       route: 'QuickChallenge', color: () => '#FF9500',         desc: 'challenge' },
    { id: '7',  key: 'movie',      iconLib: MaterialCommunityIcons, iconName: 'movie-open',  route: 'MoviePicker',    color: t => t.colors.success,   desc: 'movie' },
    { id: '8',  key: 'tournament', iconLib: Ionicons,                iconName: 'trophy',      route: 'Tournament',     color: () => '#FFD60A',         desc: 'tournament' },
    { id: '9',  key: 'orderteam',  iconLib: Ionicons,                iconName: 'people',      route: 'OrderTeam',      color: t => t.colors.accent,    desc: 'orderteam' },
    { id: '10', key: 'lists',      iconLib: Ionicons,                iconName: 'bookmark',    route: 'SavedLists',     color: t => t.colors.primary,   desc: 'lists' },
    { id: '11', key: 'truthordare', iconLib: MaterialCommunityIcons, iconName: 'cards-playing-outline', route: 'TruthOrDare', color: () => '#E91E63', desc: 'truthordare' },
];

const TOOL_BY_ID = new Map(TOOL_DEFS.map(t => [t.id, t]));

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        listContent: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl },
        headerContainer: { paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md },
        titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingLeft: theme.spacing.xs },
        titleSection: { alignItems: 'flex-start', flex: 1 },
        proBadge: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: theme.colors.primary,
            borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7,
            marginTop: 4,
            shadowColor: theme.colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
        },
        proBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
        banner: { marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
        title: { fontSize: 30, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.8 },
        subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 5, fontWeight: '400', letterSpacing: 0 },
        columnWrapper: { justifyContent: 'space-between' },
        card: {
            width: (width - (theme.spacing.md * 3)) / 2,
            aspectRatio: 0.9,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.md,
        },
        iconContainer: {
            width: 70, height: 70, borderRadius: 35,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: theme.spacing.md,
        },
        cardTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 4 },
        cardDesc: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', fontWeight: '500' },
        starBtn: {
            position: 'absolute', top: 8, right: 8,
            width: 32, height: 32, borderRadius: 16,
            alignItems: 'center', justifyContent: 'center',
        },
        // Recent strip
        recentSection: { marginBottom: theme.spacing.md },
        sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1.2, marginBottom: 8, paddingLeft: theme.spacing.xs },
        recentStrip: { flexDirection: 'row', gap: 8 },
        recentChip: {
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
            minHeight: 40,
        },
        recentChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
    });
}

export default function HomeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { isPro, openPaywall } = usePro();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [recentIds, setRecentIds] = useState<string[]>([]);

    useEffect(() => { AdManager.init(); }, []);

    const loadPrefs = useCallback(async () => {
        const [favs, recents] = await Promise.all([getFavoriteToolIds(), getRecentToolIds()]);
        setFavoriteIds(new Set(favs));
        setRecentIds(recents);
    }, []);

    useFocusEffect(useCallback(() => { loadPrefs(); }, [loadPrefs]));

    const handleToolPress = useCallback((item: ToolItem) => {
        trackToolVisit(item.id);
        track('tool_opened', { tool: item.key });
        setRecentIds(prev => [item.id, ...prev.filter(id => id !== item.id)].slice(0, 4));
        navigation.navigate(item.route);
    }, [navigation]);

    const handleToggleFav = useCallback(async (item: ToolItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nowFav = await toggleFavoriteTool(item.id);
        setFavoriteIds(prev => {
            const next = new Set(prev);
            if (nowFav) next.add(item.id); else next.delete(item.id);
            return next;
        });
    }, []);

    const sortedTools = useMemo(
        () => [...TOOL_DEFS].sort((a, b) => (favoriteIds.has(b.id) ? 1 : 0) - (favoriteIds.has(a.id) ? 1 : 0)),
        [favoriteIds],
    );

    const recentTools = useMemo(
        () => recentIds.map(id => TOOL_BY_ID.get(id)).filter(Boolean) as ToolItem[],
        [recentIds],
    );

    const renderItem = useCallback(({ item }: { item: ToolItem }) => {
        const IconComponent = item.iconLib;
        const color = item.color(theme);
        const isFav = favoriteIds.has(item.id);
        return (
            <GlassCard style={styles.card} onPress={() => handleToolPress(item)}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <IconComponent name={item.iconName} size={40} color={color} />
                </View>
                <Text style={styles.cardTitle}>{t(`home.tools.${item.key}`)}</Text>
                <Text style={styles.cardDesc}>{t(`home.tools.${item.desc}_desc`, t(`home.tools.${item.key}`))}</Text>
                <TouchableOpacity
                    style={styles.starBtn}
                    onPress={() => handleToggleFav(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={isFav ? t('home.fav_remove', 'Favoriden çıkar') : t('home.fav_add', 'Favorilere ekle')}
                >
                    <Ionicons name={isFav ? 'star' : 'star-outline'} size={18} color={isFav ? '#FFD60A' : theme.colors.surfaceBorder} />
                </TouchableOpacity>
            </GlassCard>
        );
    }, [t, theme, styles, favoriteIds, handleToolPress, handleToggleFav]);

    const header = useMemo(() => (
        <View style={styles.headerContainer}>
            <View style={styles.titleRow}>
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Pick For Me</Text>
                    <Text style={styles.subtitle}>{t('home.subtitle', 'Kararsız mısın? Bırak biz karar verelim.')}</Text>
                </View>
                {!isPro && (
                    <TouchableOpacity style={styles.proBadge} onPress={openPaywall} activeOpacity={0.85}>
                        <Ionicons name="flash" size={12} color="#FFFFFF" />
                        <Text style={styles.proBadgeText}>{t('pro.upgrade_short')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <DailyChallengeCard />

            {recentTools.length > 0 && (
                <View style={styles.recentSection}>
                    <Text style={styles.sectionLabel}>{t('home.recent')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentStrip}>
                        {recentTools.map(item => {
                            const IconComponent = item.iconLib;
                            const color = item.color(theme);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.recentChip}
                                    onPress={() => handleToolPress(item)}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                >
                                    <IconComponent name={item.iconName} size={16} color={color} />
                                    <Text style={styles.recentChipText}>{t(`home.tools.${item.key}`)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
        </View>
    ), [t, isPro, openPaywall, styles, recentTools, theme, handleToolPress]);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={sortedTools}
                keyExtractor={(item) => item.id}
                numColumns={2}
                ListHeaderComponent={header}
                ListFooterComponent={<BannerAdView style={styles.banner} />}
                contentContainerStyle={styles.listContent}
                renderItem={renderItem}
                columnWrapperStyle={styles.columnWrapper}
            />
        </SafeAreaView>
    );
}
