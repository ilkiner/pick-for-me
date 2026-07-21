import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useTheme } from '../store/ThemeContext';
import { AppTheme } from '../core/Theme';
import { GlassCard } from './GlassCard';
import { ModernButton } from './ModernButton';
import { SwipeDeck } from './SwipeDeck';
import SoundManager from '../core/SoundManager';
import { MatchEngine, MatchItem } from '../core/MatchEngine';
import { ShareCard, ShareCardHandle } from './ShareCard';

// "Birlikte Seç" akışı: 1. oyuncu kaydırır → telefonu uzat ara ekranı →
// 2. oyuncu AYNI desteyi kaydırır → eşleşme / eşleşmeme sonucu.
// Film, yemek vb. her listeyle çalışır; sonuç metni resultI18nKey ile gelir.
//
// NOT: Yeni bir deste için üst bileşen `key` prop'unu değiştirerek
// bu bileşeni sıfırdan başlatmalı (remount).
interface MatchFlowProps {
    deck: MatchItem[];
    // Ör. 'tools.match.result_movie' → "🍿 Bu akşam: {{item}}"
    resultI18nKey: string;
    // "Tekrar dene" → üst bileşen yeni deste kurar
    onRetry: () => void;
    // "Tür değiştir" / kaynağa dön
    onChangeSource: () => void;
}

type Phase = 'p1' | 'handoff' | 'p2' | 'done';

const CONFETTI_COLORS = ['#6366F1', '#A855F7', '#22D3EE', '#F59E0B', '#10B981', '#EF4444'];
const CONFETTI_COUNT = 16;

// Hafif konfeti: paket bağımlılığı olmadan Moti ile düşen renkli parçalar.
function ConfettiBurst() {
    const pieces = useMemo(() =>
        Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
            left: Math.random() * 100,
            delay: Math.random() * 400,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            rotate: (Math.random() * 720 - 360),
            size: 8 + Math.random() * 6,
        })), []);

    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {pieces.map((p, i) => (
                <MotiView
                    key={i}
                    from={{ translateY: -30, opacity: 1, rotate: '0deg' }}
                    animate={{ translateY: 420, opacity: 0, rotate: `${p.rotate}deg` }}
                    transition={{ type: 'timing', duration: 1800, delay: p.delay }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${p.left}%`,
                        width: p.size,
                        height: p.size,
                        borderRadius: 2,
                        backgroundColor: p.color,
                    }}
                />
            ))}
        </View>
    );
}

export function MatchFlow({ deck, resultI18nKey, onRetry, onChangeSource }: MatchFlowProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [phase, setPhase] = useState<Phase>('p1');
    const [likesA, setLikesA] = useState<string[]>([]);
    const [matchedLabel, setMatchedLabel] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const shareCardRef = useRef<ShareCardHandle>(null);

    const handlePlayer1Done = (likedIds: string[]) => {
        setLikesA(likedIds);
        setPhase('handoff');
    };

    const handlePlayer2Done = (likedIds: string[]) => {
        const matchId = MatchEngine.findMatch(deck.map(i => i.id), likesA, likedIds);
        const matched = matchId ? deck.find(i => i.id === matchId) ?? null : null;
        setMatchedLabel(matched ? matched.label : null);
        setPhase('done');
        if (matched) {
            SoundManager.play('winner');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
    };

    const handleShare = async () => {
        if (isSharing || !matchedLabel) return;
        setIsSharing(true);
        try {
            await shareCardRef.current?.share({
                text: t(resultI18nKey, { item: matchedLabel }),
                badge: t('tools.match.mode_together', 'Birlikte Seç'),
                emoji: '🎉',
            });
        } finally {
            setIsSharing(false);
        }
    };

    if (phase === 'p1' || phase === 'p2') {
        return (
            <View style={styles.flex}>
                <Text style={styles.playerLabel}>
                    {phase === 'p1' ? t('tools.match.player1', '1. Oyuncu') : t('tools.match.player2', '2. Oyuncu')}
                </Text>
                <Text style={styles.hint}>{t('tools.match.swipe_hint', 'Sağa kaydır = beğen · Sola kaydır = geç')}</Text>
                <SwipeDeck
                    key={phase}
                    items={deck}
                    onComplete={phase === 'p1' ? handlePlayer1Done : handlePlayer2Done}
                />
            </View>
        );
    }

    if (phase === 'handoff') {
        return (
            <View style={styles.centered}>
                <GlassCard style={styles.handoffCard}>
                    <Ionicons name="swap-horizontal" size={72} color={theme.colors.primary} />
                    <Text style={styles.handoffTitle}>{t('tools.match.handoff_title', 'Telefonu arkadaşına uzat')}</Text>
                    <Text style={styles.handoffSub}>{t('tools.match.handoff_sub', 'Sıra 2. oyuncuda — aynı desteyi o da kaydıracak.')}</Text>
                </GlassCard>
                <ModernButton
                    title={t('tools.match.handoff_continue', 'Hazırım, Devam')}
                    onPress={() => setPhase('p2')}
                    variant="primary"
                    style={styles.fullBtn}
                />
            </View>
        );
    }

    // phase === 'done'
    if (matchedLabel) {
        return (
            <View style={styles.centered}>
                <ConfettiBurst />
                <MotiView
                    from={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                >
                    <GlassCard style={styles.matchCard}>
                        <Text style={styles.matchText} adjustsFontSizeToFit numberOfLines={4}>
                            {t(resultI18nKey, { item: matchedLabel })}
                        </Text>
                    </GlassCard>
                </MotiView>

                <ShareCard ref={shareCardRef} />

                <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={handleShare}
                    disabled={isSharing}
                    accessibilityRole="button"
                    accessibilityLabel={t('result.share', 'Paylaş')}
                >
                    <Ionicons name="share-outline" size={20} color="#FFF" />
                    <Text style={styles.shareBtnText}>{isSharing ? '…' : t('result.share', 'Paylaş')}</Text>
                </TouchableOpacity>

                <ModernButton
                    title={t('tools.match.retry', 'Tekrar Oyna')}
                    onPress={onRetry}
                    variant="outline"
                    style={styles.fullBtn}
                />
            </View>
        );
    }

    return (
        <View style={styles.centered}>
            <GlassCard style={styles.handoffCard}>
                <Ionicons name="sad-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.handoffTitle}>{t('tools.match.no_match_title', 'Ortak seçim çıkmadı')}</Text>
                <Text style={styles.handoffSub}>{t('tools.match.no_match_sub', 'Yeni bir desteyle tekrar deneyin.')}</Text>
            </GlassCard>
            <ModernButton
                title={t('tools.match.retry_new_deck', 'Tekrar Dene')}
                onPress={onRetry}
                variant="primary"
                style={styles.fullBtn}
            />
            <ModernButton
                title={t('tools.match.change_source', 'Tür Değiştir')}
                onPress={onChangeSource}
                variant="outline"
                style={styles.fullBtn}
            />
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        flex: { flex: 1 },
        centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
        playerLabel: { color: theme.colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
        hint: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: theme.spacing.md },
        handoffCard: { alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.md, width: '100%' },
        handoffTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
        handoffSub: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
        fullBtn: { width: '100%', marginTop: theme.spacing.md },
        viewShot: { alignItems: 'center', backgroundColor: theme.colors.background, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg },
        matchCard: { minWidth: 280, minHeight: 200, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
        matchText: { color: theme.colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 38 },
        watermark: { marginTop: 8, color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
        shareBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.lg,
            backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
            paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, minHeight: 44,
        },
        shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    });
}
