import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import SoundManager from '../../core/SoundManager';
import { celebrateWinner } from '../../core/celebrate';
import TOD_DATA from '../../content/truthOrDare.json';

type CardType = 'truth' | 'dare';

type TodLang = 'tr' | 'en' | 'es';
const TOD = TOD_DATA as { truth: Record<TodLang, string[]>; dare: Record<TodLang, string[]> };

const TYPE_COLOR: Record<CardType, string> = {
    truth: '#4ECDC4',
    dare: '#FF6B6B',
};

export default function TruthOrDareScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const lang = (['tr', 'es'].includes(i18n.language) ? i18n.language : 'en') as TodLang;

    const [players, setPlayers] = useState<string[]>([]);
    const [newPlayer, setNewPlayer] = useState('');
    const [turnIndex, setTurnIndex] = useState(0);
    const [card, setCard] = useState<{ type: CardType; text: string } | null>(null);
    const [cardKey, setCardKey] = useState(0);

    // Aynı oturumda tekrarları önle: tür başına kullanılan indeksler.
    // Havuz bitince sıfırlanır ve baştan başlar.
    const usedRef = useRef<Record<CardType, Set<number>>>({ truth: new Set(), dare: new Set() });

    const addPlayer = () => {
        const name = newPlayer.trim();
        if (!name) return;
        setPlayers(p => [...p, name]);
        setNewPlayer('');
    };

    const removePlayer = (index: number) => {
        setPlayers(p => {
            const next = p.filter((_, i) => i !== index);
            if (next.length > 0) setTurnIndex(ti => ti % next.length);
            else setTurnIndex(0);
            return next;
        });
    };

    const pickCard = (requested: CardType | 'random') => {
        const type: CardType = requested === 'random' ? (Math.random() < 0.5 ? 'truth' : 'dare') : requested;
        const pool = TOD[type][lang];

        const used = usedRef.current[type];
        let unseen = pool.map((_, i) => i).filter(i => !used.has(i));
        if (unseen.length === 0) {
            used.clear();
            unseen = pool.map((_, i) => i);
        }
        const idx = unseen[Math.floor(Math.random() * unseen.length)];
        used.add(idx);

        SoundManager.play('tap');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setCard({ type, text: pool[idx] });
        setCardKey(k => k + 1);
        if (players.length > 0) setTurnIndex(ti => (card ? (ti + 1) % players.length : ti));
        celebrateWinner();
    };

    const currentPlayer = players.length > 0 ? players[turnIndex] : null;
    const cardColor = card ? TYPE_COLOR[card.type] : theme.colors.primary;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel={t('common.back', 'Geri')} accessibilityRole="button">
                            <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.title}>{t('tools.truthordare.title', 'Doğruluk mu Cesaret mi?')}</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    {/* Oyuncular (opsiyonel) */}
                    <Text style={styles.sectionLabel}>{t('tools.truthordare.players_label', 'Oyuncular (opsiyonel)')}</Text>
                    <View style={styles.playerInputRow}>
                        <TextInput
                            style={styles.playerInput}
                            placeholder={t('tools.truthordare.add_player', 'İsim ekle...')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={newPlayer}
                            onChangeText={setNewPlayer}
                            onSubmitEditing={addPlayer}
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={addPlayer} accessibilityLabel={t('common.add', 'Ekle')} accessibilityRole="button">
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    {players.length > 0 && (
                        <View style={styles.playerChips}>
                            {players.map((p, i) => (
                                <TouchableOpacity
                                    key={`${p}-${i}`}
                                    style={[styles.playerChip, i === turnIndex && styles.playerChipActive]}
                                    onPress={() => removePlayer(i)}
                                    accessibilityLabel={`${p} — ${t('tools.wheel.delete', 'Sil')}`}
                                    accessibilityRole="button"
                                >
                                    <Text style={[styles.playerChipText, i === turnIndex && styles.playerChipTextActive]}>{p}</Text>
                                    <Ionicons name="close" size={13} color={i === turnIndex ? '#fff' : theme.colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Sıra göstergesi */}
                    {currentPlayer && (
                        <MotiView key={`turn-${turnIndex}-${cardKey}`} from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }}>
                            <Text style={styles.turnText}>
                                {t('tools.truthordare.turn_label', 'Sıra')}: <Text style={styles.turnName}>{currentPlayer}</Text>
                            </Text>
                        </MotiView>
                    )}

                    {/* Kart */}
                    {card ? (
                        <MotiView
                            key={cardKey}
                            from={{ opacity: 0, scale: 0.7, rotate: '-3deg' }}
                            animate={{ opacity: 1, scale: 1, rotate: '0deg' }}
                            transition={{ type: 'spring', damping: 13 }}
                        >
                            <GlassCard style={[styles.card, { borderColor: cardColor + '55' }] as any}>
                                <View style={[styles.typeBadge, { backgroundColor: cardColor + '22' }]}>
                                    <Ionicons name={card.type === 'truth' ? 'chatbubble-ellipses-outline' : 'flame-outline'} size={14} color={cardColor} />
                                    <Text style={[styles.typeBadgeText, { color: cardColor }]}>
                                        {card.type === 'truth' ? t('tools.truthordare.truth', 'Doğruluk') : t('tools.truthordare.dare', 'Cesaret')}
                                    </Text>
                                </View>
                                <Text style={styles.cardText} adjustsFontSizeToFit numberOfLines={6}>{card.text}</Text>
                            </GlassCard>
                        </MotiView>
                    ) : (
                        <GlassCard style={styles.card}>
                            <Ionicons name="help-circle-outline" size={54} color={theme.colors.surfaceBorder} />
                            <Text style={styles.emptyText}>{t('tools.truthordare.empty', 'Seçimini yap: doğruluk mu, cesaret mi?')}</Text>
                        </GlassCard>
                    )}

                    {/* Seçim butonları */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.bigBtn, { backgroundColor: TYPE_COLOR.truth }]}
                            onPress={() => pickCard('truth')}
                            accessibilityRole="button"
                            accessibilityLabel={t('tools.truthordare.truth', 'Doğruluk')}
                        >
                            <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
                            <Text style={styles.bigBtnText}>{t('tools.truthordare.truth', 'Doğruluk')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.bigBtn, { backgroundColor: TYPE_COLOR.dare }]}
                            onPress={() => pickCard('dare')}
                            accessibilityRole="button"
                            accessibilityLabel={t('tools.truthordare.dare', 'Cesaret')}
                        >
                            <Ionicons name="flame" size={26} color="#fff" />
                            <Text style={styles.bigBtnText}>{t('tools.truthordare.dare', 'Cesaret')}</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.randomBtn}
                        onPress={() => pickCard('random')}
                        accessibilityRole="button"
                        accessibilityLabel={t('tools.truthordare.random', 'Rastgele')}
                    >
                        <Ionicons name="shuffle-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.randomBtnText}>{t('tools.truthordare.random', 'Rastgele')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
        backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
        title: { fontSize: 19, fontWeight: '900', color: theme.colors.text, textAlign: 'center', flex: 1, paddingHorizontal: 6 },

        sectionLabel: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
        playerInputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
        playerInput: { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: theme.spacing.md, paddingVertical: 12, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder, fontSize: 15 },
        addBtn: { backgroundColor: theme.colors.success, width: 48, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center', minHeight: 44 },
        playerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
        playerChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.surfaceBorder, minHeight: 34 },
        playerChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
        playerChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
        playerChipTextActive: { color: '#fff' },
        turnText: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 10, fontWeight: '600' },
        turnName: { color: theme.colors.primary, fontWeight: '900' },

        card: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, marginBottom: theme.spacing.lg, gap: 14, borderWidth: 1.5 },
        typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
        typeBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
        cardText: { color: theme.colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 30 },
        emptyText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', fontWeight: '500' },

        btnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
        bigBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 20, borderRadius: theme.borderRadius.lg, minHeight: 88 },
        bigBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
        randomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.surfaceBorder, backgroundColor: theme.colors.surface, minHeight: 48 },
        randomBtnText: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
    });
}
