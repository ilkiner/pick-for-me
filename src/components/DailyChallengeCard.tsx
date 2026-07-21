import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useTheme } from '../store/ThemeContext';
import { AppTheme } from '../core/Theme';
import { GlassCard } from './GlassCard';
import { ShareCard, ShareCardHandle } from './ShareCard';
import SoundManager from '../core/SoundManager';
import { track } from '../core/Analytics';
import {
    getDailyChallenge,
    isDailyCompleted,
    markDailyCompleted,
    DailyChallenge,
    ChallengeCategory,
} from '../core/daily';

// Hızlı Görev aracındaki kategori görselleriyle aynı dil
const CATEGORY_META: Record<ChallengeCategory, { icon: string; color: string }> = {
    home:         { icon: 'home-outline',    color: '#FF9F43' },
    sport:        { icon: 'barbell-outline', color: '#FF6B6B' },
    social:       { icon: 'people-outline',  color: '#6366F1' },
    productivity: { icon: 'flash-outline',   color: '#FFD166' },
    fun:          { icon: 'happy-outline',   color: '#4ECDC4' },
    selfcare:     { icon: 'leaf-outline',    color: '#10B981' },
};

export function DailyChallengeCard() {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
    const [completed, setCompleted] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const shareCardRef = useRef<ShareCardHandle>(null);

    // Focus'ta yenile: gece yarısı geçtiyse görev ve durum değişmiş olabilir.
    useFocusEffect(
        useCallback(() => {
            setChallenge(getDailyChallenge());
            isDailyCompleted().then(setCompleted);
        }, [])
    );

    const lang = (['tr', 'es'].includes(i18n.language) ? i18n.language : 'en') as 'tr' | 'en' | 'es';
    const challengeText = challenge
        ? (lang === 'tr' ? challenge.text_tr : lang === 'es' ? challenge.text_es : challenge.text_en)
        : '';

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            await shareCardRef.current?.share({
                text: t('home.daily.share_text', {
                    defaultValue: 'Bugünün görevini tamamladım: {{task}}',
                    task: challengeText,
                }),
                badge: t('home.daily.title', 'Bugünün Görevi'),
                emoji: '⚡',
            });
        } finally {
            setIsSharing(false);
        }
    };

    const handleComplete = async () => {
        if (completed) return;
        setCompleted(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        SoundManager.play('winner');
        track('daily_challenge_completed', { id: challenge?.id ?? '' });
        await markDailyCompleted();
    };

    if (!challenge) return null;

    const meta = CATEGORY_META[challenge.category];

    return (
        <>
        <GlassCard style={[styles.card, completed && styles.cardDone] as any}>
            <View style={styles.topRow}>
                <View style={styles.titleWrap}>
                    <Ionicons name="flash" size={14} color={completed ? theme.colors.success : '#FF9500'} />
                    <Text style={[styles.title, completed && { color: theme.colors.success }]}>
                        {t('home.daily.title', 'Bugünün Görevi')}
                    </Text>
                </View>
                <View style={[styles.categoryChip, { backgroundColor: meta.color + '20' }]}>
                    <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                    <Text style={[styles.categoryText, { color: meta.color }]}>
                        {t(`tools.challenge.categories.${challenge.category}`)}
                    </Text>
                </View>
            </View>

            <Text style={styles.challengeText}>{challengeText}</Text>

            {completed ? (
                <MotiView
                    from={{ opacity: 0, translateY: 6 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350 }}
                    style={styles.doneRow}
                >
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                    <Text style={styles.doneText}>{t('home.daily.done_msg', 'Yarın yenisi seni bekliyor ✅')}</Text>
                    <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={handleShare}
                        disabled={isSharing}
                        accessibilityRole="button"
                        accessibilityLabel={t('result.share', 'Paylaş')}
                    >
                        <Ionicons name="share-outline" size={16} color="#FFF" />
                        <Text style={styles.shareBtnText}>{isSharing ? '…' : t('result.share', 'Paylaş')}</Text>
                    </TouchableOpacity>
                </MotiView>
            ) : (
                <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={handleComplete}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.daily.done_btn', 'Tamamladım')}
                >
                    <Ionicons name="checkmark-done" size={17} color="#FFF" />
                    <Text style={styles.doneBtnText}>{t('home.daily.done_btn', 'Tamamladım')}</Text>
                </TouchableOpacity>
            )}
        </GlassCard>
        <ShareCard ref={shareCardRef} />
        </>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        card: {
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            borderWidth: 1,
            borderColor: 'rgba(255,149,0,0.35)',
            gap: 10,
        },
        cardDone: {
            borderColor: theme.colors.success + '60',
            backgroundColor: theme.colors.success + '14',
        },
        topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        title: {
            fontSize: 12, fontWeight: '800', color: '#FF9500',
            letterSpacing: 1, textTransform: 'uppercase',
        },
        categoryChip: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
        },
        categoryText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
        challengeText: { fontSize: 17, fontWeight: '800', color: theme.colors.text, lineHeight: 24 },
        doneBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
            backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
            paddingVertical: 12, minHeight: 44,
        },
        doneBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
        doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
        doneText: { color: theme.colors.success, fontWeight: '700', fontSize: 14, flex: 1 },
        shareBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
            paddingHorizontal: 14, paddingVertical: 9, minHeight: 38,
        },
        shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    });
}
