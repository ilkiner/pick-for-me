import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { PickEngine, BracketMatch } from '../../core/PickEngine';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { SavedList } from '../../storage/savedLists';

type Phase = 'setup' | 'playing' | 'champion';

export default function TournamentScreen({ navigation, route }: any) {
    const { t } = useTranslation();

    const [phase, setPhase] = useState<Phase>('setup');
    const [items, setItems] = useState<string[]>([]);
    const [newItem, setNewItem] = useState('');
    const [matches, setMatches] = useState<BracketMatch[]>([]);
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
    const [round, setRound] = useState(1);
    const [roundWinners, setRoundWinners] = useState<string[]>([]);
    const [champion, setChampion] = useState<string | null>(null);

    // Accept list injected from SavedListsScreen
    React.useEffect(() => {
        if (route.params?.pickedList) {
            const list = route.params.pickedList as SavedList;
            setItems(list.items);
        }
    }, [route.params?.pickedList]);

    const addItem = () => {
        const val = newItem.trim();
        if (!val) return;
        setItems(prev => [...prev, val]);
        setNewItem('');
    };

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

    const startTournament = () => {
        if (items.length < 2) {
            Alert.alert(t('tournament.need_items_title', 'Yetersiz'), t('tournament.need_items_msg', 'En az 2 katılımcı gerekli.'));
            return;
        }
        const firstRound = PickEngine.buildBracket(items);
        setMatches(firstRound);
        setCurrentMatchIdx(0);
        setRound(1);
        setRoundWinners([]);
        setChampion(null);
        setPhase('playing');
    };

    const pickWinner = (winner: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newWinners = [...roundWinners, winner];
        const remaining = matches.length - (currentMatchIdx + 1);

        if (remaining > 0) {
            setRoundWinners(newWinners);
            setCurrentMatchIdx(prev => prev + 1);
        } else {
            // End of round
            const { matches: nextMatches, champion: champ } = PickEngine.nextBracketRound(newWinners);
            if (champ) {
                setChampion(champ);
                setPhase('champion');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                navigation.navigate('Result', { result: champ, type: 'tournament' });
            } else {
                setMatches(nextMatches);
                setCurrentMatchIdx(0);
                setRound(prev => prev + 1);
                setRoundWinners([]);
            }
        }
    };

    const reset = () => {
        setPhase('setup');
        setMatches([]);
        setCurrentMatchIdx(0);
        setRound(1);
        setRoundWinners([]);
        setChampion(null);
    };

    const loadFromSavedLists = () => {
        navigation.navigate('SavedLists', { pickMode: true, returnScreen: 'Tournament' });
    };

    const currentMatch = matches[currentMatchIdx];
    const totalMatchesThisRound = matches.length;
    const progress = totalMatchesThisRound > 0 ? (currentMatchIdx / totalMatchesThisRound) : 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={phase === 'playing' ? reset : () => navigation.goBack()}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel={phase === 'playing' ? t('tournament.reset', 'Sıfırla') : t('common.back', 'Geri')}
                >
                    <Ionicons name={phase === 'playing' ? 'refresh' : 'chevron-back'} size={22} color={Theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>{t('tools.tournament.title', 'Turnuva')}</Text>
                    {phase === 'playing' && (
                        <Text style={styles.roundBadge}>{t('tournament.round', 'Tur')} {round}</Text>
                    )}
                </View>
                <View style={{ width: 44 }} />
            </View>

            {phase === 'setup' && (
                <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionLabel}>{t('tournament.participants', 'Katılımcılar')}</Text>

                    <TouchableOpacity style={styles.loadListBtn} onPress={loadFromSavedLists}>
                        <Ionicons name="bookmark-outline" size={18} color={Theme.colors.primary} />
                        <Text style={styles.loadListText}>{t('lists.load', 'Kayıtlı listeden yükle')}</Text>
                    </TouchableOpacity>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={newItem}
                            onChangeText={setNewItem}
                            onSubmitEditing={addItem}
                            placeholder={t('tournament.add_participant', 'Katılımcı ekle...')}
                            placeholderTextColor={Theme.colors.textSecondary}
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={addItem} accessibilityRole="button">
                            <Ionicons name="add" size={28} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {items.map((item, idx) => (
                        <GlassCard key={idx} style={styles.itemCard}>
                            <View style={styles.seedBadge}><Text style={styles.seedText}>{idx + 1}</Text></View>
                            <Text style={styles.itemText} numberOfLines={1}>{item}</Text>
                            <TouchableOpacity onPress={() => removeItem(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={20} color={Theme.colors.error} />
                            </TouchableOpacity>
                        </GlassCard>
                    ))}

                    {items.length >= 2 && (
                        <TouchableOpacity style={styles.startBtn} onPress={startTournament}>
                            <Ionicons name="trophy-outline" size={22} color="#FFF" />
                            <Text style={styles.startBtnText}>{t('tournament.start', 'Turnuvayı Başlat')}</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}

            {phase === 'playing' && currentMatch && (
                <View style={styles.playArea}>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.matchCounter}>
                        {currentMatchIdx + 1} / {totalMatchesThisRound} {t('tournament.match', 'maç')}
                    </Text>

                    <Text style={styles.vsLabel}>{t('tournament.pick_winner', 'Kazananı Seç')}</Text>

                    <MotiView
                        key={`match-${round}-${currentMatchIdx}`}
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        style={styles.matchContainer}
                    >
                        <TouchableOpacity
                            style={[styles.matchCard, styles.matchCardA]}
                            onPress={() => pickWinner(currentMatch.a)}
                        >
                            <Text style={styles.matchCardText} numberOfLines={3}>{currentMatch.a}</Text>
                            <View style={styles.matchCardTap}>
                                <Text style={styles.matchCardTapText}>{t('tournament.tap_win', 'Seç')}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.vsCircle}>
                            <Text style={styles.vsText}>VS</Text>
                        </View>

                        {currentMatch.b ? (
                            <TouchableOpacity
                                style={[styles.matchCard, styles.matchCardB]}
                                onPress={() => pickWinner(currentMatch.b!)}
                            >
                                <Text style={styles.matchCardText} numberOfLines={3}>{currentMatch.b}</Text>
                                <View style={styles.matchCardTap}>
                                    <Text style={styles.matchCardTapText}>{t('tournament.tap_win', 'Seç')}</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.matchCard, styles.matchCardBye]}
                                onPress={() => pickWinner(currentMatch.a)}
                            >
                                <Text style={styles.byeText}>{t('tournament.bye', 'BYE')}</Text>
                                <Text style={styles.byeHint}>{t('tournament.bye_hint', 'Otomatik geç')}</Text>
                            </TouchableOpacity>
                        )}
                    </MotiView>

                    <Text style={styles.winnersSoFar}>
                        {roundWinners.length > 0 && `${t('tournament.passed', 'Geçenler')}: ${roundWinners.join(' · ')}`}
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.md,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Theme.colors.surface,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
    },
    headerCenter: { alignItems: 'center', flex: 1 },
    title: { fontSize: 22, fontWeight: '900', color: Theme.colors.text },
    roundBadge: {
        backgroundColor: Theme.colors.primary, borderRadius: 12,
        paddingHorizontal: 10, paddingVertical: 2, marginTop: 4,
        fontSize: 11, color: '#FFF', fontWeight: '800',
    },
    setupContent: { padding: Theme.spacing.md, paddingBottom: 60 },
    sectionLabel: { color: Theme.colors.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: Theme.spacing.md },
    loadListBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md,
        backgroundColor: 'rgba(99,102,241,0.12)',
        borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
        marginBottom: Theme.spacing.md,
    },
    loadListText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 14 },
    inputRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginBottom: Theme.spacing.md },
    input: {
        flex: 1, backgroundColor: Theme.colors.surface, color: Theme.colors.text,
        borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder, fontSize: 15, minHeight: 52,
    },
    addBtn: {
        width: 52, height: 52, borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    itemCard: {
        flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, gap: Theme.spacing.sm,
    },
    seedBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(99,102,241,0.2)', alignItems: 'center', justifyContent: 'center',
    },
    seedText: { color: Theme.colors.primary, fontWeight: '800', fontSize: 12 },
    itemText: { flex: 1, color: Theme.colors.text, fontSize: 15, fontWeight: '600' },
    startBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: Theme.colors.primary, borderRadius: Theme.borderRadius.lg,
        padding: Theme.spacing.md, marginTop: Theme.spacing.xl,
    },
    startBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    playArea: { flex: 1, padding: Theme.spacing.md, alignItems: 'center' },
    progressBarTrack: {
        width: '100%', height: 4, backgroundColor: Theme.colors.surface,
        borderRadius: 2, marginBottom: Theme.spacing.sm, overflow: 'hidden',
    },
    progressBarFill: { height: '100%', backgroundColor: Theme.colors.primary, borderRadius: 2 },
    matchCounter: { color: Theme.colors.textSecondary, fontSize: 13, marginBottom: Theme.spacing.lg },
    vsLabel: {
        fontSize: 13, color: Theme.colors.textSecondary, fontWeight: '700',
        letterSpacing: 2, marginBottom: Theme.spacing.lg,
    },
    matchContainer: { width: '100%', gap: Theme.spacing.md },
    matchCard: {
        borderRadius: Theme.borderRadius.xl, padding: Theme.spacing.xl,
        alignItems: 'center', minHeight: 120, justifyContent: 'center',
        borderWidth: 2,
    },
    matchCardA: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: Theme.colors.primary },
    matchCardB: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: Theme.colors.secondary },
    matchCardBye: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: Theme.colors.surfaceBorder },
    matchCardText: { fontSize: 22, fontWeight: '900', color: Theme.colors.text, textAlign: 'center', marginBottom: 8 },
    matchCardTap: {
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 4,
    },
    matchCardTapText: { color: Theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    byeText: { fontSize: 28, fontWeight: '900', color: Theme.colors.textSecondary },
    byeHint: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4 },
    vsCircle: {
        alignSelf: 'center', width: 44, height: 44, borderRadius: 22,
        backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    vsText: { color: Theme.colors.text, fontWeight: '900', fontSize: 12 },
    winnersSoFar: {
        marginTop: Theme.spacing.xl, color: Theme.colors.textSecondary,
        fontSize: 12, textAlign: 'center', paddingHorizontal: Theme.spacing.md,
    },
});
