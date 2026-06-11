import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/GlassCard';
import { BannerAdView } from '../../components/BannerAdView';
import { AdManager } from '../../core/AdManager';
import { usePro } from '../../store/ProContext';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';

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
];

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
    });
}

export default function HomeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { isPro, openPaywall } = usePro();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    useEffect(() => { AdManager.init(); }, []);

    const renderItem = useCallback(({ item }: { item: ToolItem }) => {
        const IconComponent = item.iconLib;
        const color = item.color(theme);
        return (
            <GlassCard style={styles.card} onPress={() => navigation.navigate(item.route)}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <IconComponent name={item.iconName} size={40} color={color} />
                </View>
                <Text style={styles.cardTitle}>{t(`home.tools.${item.key}`)}</Text>
                <Text style={styles.cardDesc}>{t(`home.tools.${item.desc}_desc`, t(`home.tools.${item.key}`))}</Text>
            </GlassCard>
        );
    }, [t, navigation, theme, styles]);

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
        </View>
    ), [t, isPro, openPaywall, styles]);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={TOOL_DEFS}
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
