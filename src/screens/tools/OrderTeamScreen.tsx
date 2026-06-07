import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { PickEngine } from '../../core/PickEngine';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { SavedList } from '../../storage/savedLists';

type Mode = 'order' | 'teams';

export default function OrderTeamScreen({ navigation, route }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const TEAM_COLORS = useMemo(() => [
        theme.colors.primary, theme.colors.secondary, theme.colors.accent,
        theme.colors.error, theme.colors.success, '#FF9500', '#FF3B30', '#AF52DE',
    ], [theme]);
    const [mode, setMode] = useState<Mode>('order');
    const [items, setItems] = useState<string[]>([]);
    const [newItem, setNewItem] = useState('');
    const [teamCount, setTeamCount] = useState(2);
    const [result, setResult] = useState<string[] | string[][]>([]);
    const [hasResult, setHasResult] = useState(false);

    React.useEffect(() => {
        if (route.params?.pickedList) {
            const list = route.params.pickedList as SavedList;
            setItems(list.items);
            setHasResult(false);
            setResult([]);
        }
    }, [route.params?.pickedList]);

    const addItem = () => {
        const val = newItem.trim();
        if (!val) return;
        setItems(prev => [...prev, val]);
        setNewItem('');
        setHasResult(false);
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
        setHasResult(false);
    };

    const go = () => {
        if (items.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (mode === 'order') {
            setResult(PickEngine.shuffleOrder(items));
        } else {
            const n = Math.min(teamCount, items.length);
            setResult(PickEngine.splitTeams(items, n));
        }
        setHasResult(true);
    };

    const loadFromSavedLists = () => {
        navigation.navigate('SavedLists', { pickMode: true, returnScreen: 'OrderTeam' });
    };

    const orderedResult = result as string[];
    const teamResult = result as string[][];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.back', 'Geri')}
                >
                    <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>{t('tools.orderteam.title', 'Sıra & Takım')}</Text>
                    <Text style={styles.subtitle}>{t('tools.orderteam.subtitle', 'Karıştır veya takımlara böl')}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Mode toggle */}
                <View style={styles.modeRow}>
                    <TouchableOpacity
                        style={[styles.modeBtn, mode === 'order' && styles.modeBtnActive]}
                        onPress={() => { setMode('order'); setHasResult(false); }}
                    >
                        <Ionicons name="list-outline" size={18} color={mode === 'order' ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.modeBtnText, mode === 'order' && styles.modeBtnTextActive]}>
                            {t('tools.orderteam.mode_order', 'Sırala')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeBtn, mode === 'teams' && styles.modeBtnActive]}
                        onPress={() => { setMode('teams'); setHasResult(false); }}
                    >
                        <Ionicons name="people-outline" size={18} color={mode === 'teams' ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.modeBtnText, mode === 'teams' && styles.modeBtnTextActive]}>
                            {t('tools.orderteam.mode_teams', 'Takımlar')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Team count selector */}
                {mode === 'teams' && (
                    <View style={styles.teamCountRow}>
                        <Text style={styles.teamCountLabel}>{t('tools.orderteam.team_count', 'Takım sayısı:')}</Text>
                        {[2, 3, 4, 5].map(n => (
                            <TouchableOpacity
                                key={n}
                                style={[styles.countChip, teamCount === n && styles.countChipActive]}
                                onPress={() => { setTeamCount(n); setHasResult(false); }}
                            >
                                <Text style={[styles.countChipText, teamCount === n && styles.countChipTextActive]}>{n}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Load + Input */}
                <TouchableOpacity style={styles.loadListBtn} onPress={loadFromSavedLists}>
                    <Ionicons name="bookmark-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.loadListText}>{t('lists.load', 'Kayıtlı listeden yükle')}</Text>
                </TouchableOpacity>

                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={newItem}
                        onChangeText={setNewItem}
                        onSubmitEditing={addItem}
                        placeholder={t('tools.orderteam.add_person', 'Kişi/öğe ekle...')}
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={addItem} accessibilityRole="button">
                        <Ionicons name="add" size={26} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.chipList}>
                    {items.map((item, idx) => (
                        <View key={idx} style={styles.chip}>
                            <Text style={styles.chipText} numberOfLines={1}>{item}</Text>
                            <TouchableOpacity onPress={() => removeItem(idx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                {items.length >= 2 && (
                    <TouchableOpacity style={styles.goBtn} onPress={go}>
                        <Ionicons name={mode === 'order' ? 'shuffle-outline' : 'people'} size={22} color="#FFF" />
                        <Text style={styles.goBtnText}>
                            {mode === 'order'
                                ? t('tools.orderteam.shuffle', 'Karıştır')
                                : t('tools.orderteam.split', 'Takımlara Böl')}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Result */}
                {hasResult && mode === 'order' && (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                        style={styles.resultSection}
                    >
                        <Text style={styles.resultTitle}>{t('tools.orderteam.order_result', 'Sıralama')}</Text>
                        {orderedResult.map((item, idx) => (
                            <GlassCard key={idx} style={styles.orderRow}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>{idx + 1}</Text>
                                </View>
                                <Text style={styles.orderItemText}>{item}</Text>
                            </GlassCard>
                        ))}
                    </MotiView>
                )}

                {hasResult && mode === 'teams' && (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                        style={styles.resultSection}
                    >
                        <Text style={styles.resultTitle}>{t('tools.orderteam.teams_result', 'Takımlar')}</Text>
                        {teamResult.map((team, tidx) => (
                            <GlassCard key={tidx} style={[styles.teamCard, { borderLeftColor: TEAM_COLORS[tidx % TEAM_COLORS.length] }] as any}>
                                <Text style={[styles.teamTitle, { color: TEAM_COLORS[tidx % TEAM_COLORS.length] }]}>
                                    {t('tools.orderteam.team_label', 'Takım')} {tidx + 1}
                                </Text>
                                {team.map((member, midx) => (
                                    <Text key={midx} style={styles.memberText}>· {member}</Text>
                                ))}
                            </GlassCard>
                        ))}
                    </MotiView>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    },
    headerCenter: { alignItems: 'center', flex: 1 },
    title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
    subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    content: { padding: theme.spacing.md, paddingBottom: 60 },
    modeRow: {
        flexDirection: 'row', gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    modeBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: theme.spacing.md, borderRadius: theme.borderRadius.lg,
        borderWidth: 1, borderColor: theme.colors.surfaceBorder, backgroundColor: theme.colors.surface,
    },
    modeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    modeBtnText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 14 },
    modeBtnTextActive: { color: '#FFF' },
    teamCountRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md, flexWrap: 'wrap',
    },
    teamCountLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginRight: 4 },
    countChip: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    },
    countChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    countChipText: { color: theme.colors.textSecondary, fontWeight: '800', fontSize: 14 },
    countChipTextActive: { color: '#FFF' },
    loadListBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md, backgroundColor: 'rgba(99,102,241,0.12)',
        borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', marginBottom: theme.spacing.md,
    },
    loadListText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
    inputRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
    input: {
        flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text,
        borderRadius: theme.borderRadius.md, padding: theme.spacing.md,
        borderWidth: 1, borderColor: theme.colors.surfaceBorder, fontSize: 15, minHeight: 52,
    },
    addBtn: {
        width: 52, height: 52, borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.colors.surface, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    },
    chipText: { color: theme.colors.text, fontSize: 14, maxWidth: 120 },
    goBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md, marginBottom: theme.spacing.xl,
    },
    goBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    resultSection: { marginTop: theme.spacing.sm },
    resultTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 2, marginBottom: theme.spacing.md },
    orderRow: {
        flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md,
        marginBottom: theme.spacing.sm, borderRadius: theme.borderRadius.md, gap: theme.spacing.md,
    },
    rankBadge: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(99,102,241,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    rankText: { color: theme.colors.primary, fontWeight: '900', fontSize: 14 },
    orderItemText: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
    teamCard: {
        padding: theme.spacing.md, marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.md, borderLeftWidth: 4,
    },
    teamTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
    memberText: { color: theme.colors.text, fontSize: 15, paddingVertical: 2 },
    });
}
