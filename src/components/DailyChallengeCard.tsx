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
    isDailyDismissed,
    markDailyDismissed,
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
    const [dismissed, setDismissed] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const shareCardRef = useRef<ShareCardHandle>(null);

    // Focus'ta yenile: gece yarısı geçtiyse görev ve durum değişmiş olabilir.
    useFocusEffect(
        useCallback(() => {
            let alive = true;
            setChallenge(getDailyChallenge());
            isDailyCompleted().then(v => { if (alive) setCompleted(v); });
            isDailyDismissed().then(v => { if (alive) setDismissed(v); });
            return () => { alive = false; };
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

    // Kartı o gün için gizle. Ertesi gün (yeni tarih anahtarı) kendiliğinden geri gelir.
    const handleDismiss = async () => {
        setDismissed(true);
        Haptics.selectionAsync().catch(() => {});
        track('daily_challenge_dismissed', { id: challenge?.id ?? '', completed });
        await markDailyDismissed();
    };

    if (!challenge || dismissed) return null;

    const meta = CATEGORY_META[challenge.category];

    return (
        <>
        <GlassCard style={[styles.card, completed && styles.cardDone] as any}>
            <View style={styles.topRow}>
                {/* Başlık + rozet sarmalanabilir bir grup: dar ekranda ya da uzun
                    çeviride (EN "Productivity") rozet alt satıra geçer, başlık
                    kırpılmaz ve kapat butonu köşede sabit kalır. */}
                <View style={styles.headerInfo}>
                    <View style={styles.titleWrap}>
                        <Ionicons name="flash" size={14} color={completed ? theme.colors.successText : '#FF9500'} />
                        <Text style={[styles.title, completed && { color: theme.colors.successText }]}>
                            {t('home.daily.title', 'Bugünün Görevi')}
                        </Text>
                    </View>
                    <View style={[styles.categoryChip, { backgroundColor: meta.color + '20' }]}>
                        <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                        <Text style={[styles.categoryText, { color: meta.color }]} numberOfLines={1}>
                            {t(`tools.challenge.categories.${challenge.category}`)}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={handleDismiss}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.daily.hide', 'Bugün için gizle')}
                >
                    <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <Text style={styles.challengeText}>{challengeText}</Text>

            {completed ? (
                <MotiView
                    from={{ opacity: 0, translateY: 6 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 350 }}
                    style={styles.doneBlock}
                >
                    <View style={styles.doneRow}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.successText} />
                        <Text style={styles.doneText}>{t('home.daily.done_msg', 'Yarın yenisi seni bekliyor ✅')}</Text>
                    </View>
                    {/* Paylaş, "Tamamladım" ile aynı geometride tam genişlikte:
                        uzun çevirilerde bile taşma/kırılma olmuyor. */}
                    <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={handleShare}
                        disabled={isSharing}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={t('result.share', 'Paylaş')}
                    >
                        <Ionicons name="share-outline" size={17} color="#FFF" />
                        <Text style={styles.shareBtnText} numberOfLines={1}>
                            {isSharing ? '…' : t('result.share', 'Paylaş')}
                        </Text>
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
        // TEK KATMAN: başlıktan Paylaş butonuna kadar her şey bu tek yüzeyin
        // içinde. Dört kenarda da aynı iç boşluk (spacing.md) ve çocuklar
        // arasında sabit gap — kart içinde ikinci bir zemin YOK.
        card: {
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            borderWidth: 1,
            borderColor: 'rgba(255,149,0,0.35)',
            gap: 12,
        },
        // Tamamlandı durumu yüzeyi DEĞİŞTİRİR, saydamlaştırmaz. Eskiden burada
        // `success + '14'` vardı: %8 saydam yeşil, GlassCard'ın opak beyaz
        // zeminini komple değiştiriyordu. Sonuçta light mode'da kartın beyaz
        // yüzeyi kaybolup içerik lavanta sayfa zemininin üstünde kalıyordu
        // (hesaplanan renk #E0EAF3, sayfaya karşı kontrast 1.09). Dark mode'da
        // fark edilmiyordu çünkü oradaki `surface` zaten saydam.
        cardDone: {
            backgroundColor: theme.colors.successSurface,
            borderColor: theme.colors.success + '60',
        },
        topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
        headerInfo: {
            flex: 1, flexDirection: 'row', alignItems: 'center',
            flexWrap: 'wrap', columnGap: 8, rowGap: 6,
        },
        titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        title: {
            fontSize: 12, fontWeight: '800', color: '#FF9500',
            letterSpacing: 1, textTransform: 'uppercase',
        },
        categoryChip: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
            flexShrink: 1,
        },
        categoryText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, flexShrink: 1 },
        // 28x28 dokunma alanı (hitSlop ile daha da büyük). Negatif marjlar ikonu
        // kartın sağ üst köşesine optik olarak oturtur; satır yüksekliğini
        // büyütmez ve kapat butonu rozet alt satıra kaysa bile köşede kalır.
        closeBtn: {
            width: 28, height: 28, borderRadius: 14,
            alignItems: 'center', justifyContent: 'center',
            marginRight: -6, marginTop: -6, marginBottom: -6,
        },
        challengeText: { fontSize: 17, fontWeight: '800', color: theme.colors.text, lineHeight: 24 },
        doneBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
            backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
            paddingHorizontal: theme.spacing.md, paddingVertical: 12, minHeight: 44,
        },
        doneBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
        // Tamamlandı mesajı ve Paylaş butonu artık dikey: aynı satırda sıkışmıyorlar.
        doneBlock: { gap: 12 },
        doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        doneText: { color: theme.colors.successText, fontWeight: '700', fontSize: 14, flex: 1, lineHeight: 20 },
        shareBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
            backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
            paddingHorizontal: theme.spacing.md, paddingVertical: 12, minHeight: 44,
        },
        shareBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
    });
}
