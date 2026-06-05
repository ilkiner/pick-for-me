import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';

const { width } = Dimensions.get('window');

type ToolItem = { id: string; key: string; iconLib: any; iconName: string; route: string; color: string; desc: string };

const TOOLS: ToolItem[] = [
    { id: '1', key: 'wheel', iconLib: MaterialCommunityIcons, iconName: 'steering', route: 'WheelOfFortune', color: Theme.colors.secondary, desc: 'spin' },
    { id: '2', key: 'dice', iconLib: FontAwesome5, iconName: 'dice', route: 'Dice', color: Theme.colors.error, desc: 'roll' },
    { id: '3', key: 'coin', iconLib: FontAwesome5, iconName: 'coins', route: 'CoinFlip', color: Theme.colors.accent, desc: 'flip' },
    { id: '4', key: 'color', iconLib: Ionicons, iconName: 'color-palette', route: 'ColorPicker', color: '#AF52DE', desc: 'color' },
    { id: '5', key: 'idea', iconLib: FontAwesome5, iconName: 'lightbulb', route: 'IdeaGenerator', color: '#FFD60A', desc: 'idea' },
    { id: '6', key: 'challenge', iconLib: Ionicons, iconName: 'flash', route: 'QuickChallenge', color: '#FF9500', desc: 'challenge' },
    { id: '7', key: 'movie', iconLib: MaterialCommunityIcons, iconName: 'movie-open', route: 'MoviePicker', color: Theme.colors.success, desc: 'movie' },
    { id: '8', key: 'tournament', iconLib: Ionicons, iconName: 'trophy', route: 'Tournament', color: '#FFD60A', desc: 'tournament' },
    { id: '9', key: 'orderteam', iconLib: Ionicons, iconName: 'people', route: 'OrderTeam', color: Theme.colors.accent, desc: 'orderteam' },
    { id: '10', key: 'lists', iconLib: Ionicons, iconName: 'bookmark', route: 'SavedLists', color: Theme.colors.primary, desc: 'lists' },
];

export default function HomeScreen({ navigation }: any) {
    const { t } = useTranslation();

    const renderItem = useCallback(({ item }: { item: ToolItem }) => {
        const IconComponent = item.iconLib;
        return (
            <GlassCard
                style={styles.card}
                onPress={() => navigation.navigate(item.route)}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                    <IconComponent name={item.iconName} size={40} color={item.color} />
                </View>
                <Text style={styles.cardTitle}>{t(`home.tools.${item.key}`)}</Text>
                <Text style={styles.cardDesc}>{t(`home.tools.${item.desc}_desc`, t(`home.tools.${item.key}`))}</Text>
            </GlassCard>
        );
    }, [t, navigation]);

    const header = useMemo(() => (
        <View style={styles.headerContainer}>
            <View style={styles.titleSection}>
                <Text style={styles.title}>PICK FOR ME</Text>
                <Text style={styles.subtitle}>{t('home.subtitle', 'Hızlı karar veriniz')}</Text>
            </View>
        </View>
    ), [t]);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={TOOLS}
                keyExtractor={(item) => item.id}
                numColumns={2}
                ListHeaderComponent={header}
                contentContainerStyle={styles.listContent}
                renderItem={renderItem}
                columnWrapperStyle={styles.columnWrapper}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background
    },
    listContent: {
        paddingHorizontal: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
    },
    headerContainer: {
        paddingVertical: Theme.spacing.lg,
    },
    titleSection: {
        alignItems: 'flex-start',
        paddingLeft: Theme.spacing.xs,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: Theme.colors.text,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 16,
        color: Theme.colors.textSecondary,
        marginTop: 4,
        fontWeight: '500',
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    card: {
        width: (width - (Theme.spacing.md * 3)) / 2,
        aspectRatio: 0.9,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Theme.spacing.md,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Theme.spacing.md,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Theme.colors.text,
        textAlign: 'center',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    }
});

