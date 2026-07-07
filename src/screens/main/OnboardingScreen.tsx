import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';

const { width } = Dimensions.get('window');

export const ONBOARDING_KEY = '@pickforme:onboardingSeen';

type Slide = { icon: keyof typeof Ionicons.glyphMap; color: string; titleKey: string; bodyKey: string };

const SLIDES: Slide[] = [
    { icon: 'sparkles',    color: '#6366F1', titleKey: 'onboarding.slide1.title', bodyKey: 'onboarding.slide1.body' },
    { icon: 'grid',        color: '#A855F7', titleKey: 'onboarding.slide2.title', bodyKey: 'onboarding.slide2.body' },
    { icon: 'flash',       color: '#FFD60A', titleKey: 'onboarding.slide3.title', bodyKey: 'onboarding.slide3.body' },
];

// Adım dizisi: slayt 1 → tema seçimi (atlanabilir) → kalan slaytlar
type Step = { kind: 'slide'; slide: Slide } | { kind: 'theme' };

const STEPS: Step[] = [
    { kind: 'slide', slide: SLIDES[0] },
    { kind: 'theme' },
    { kind: 'slide', slide: SLIDES[1] },
    { kind: 'slide', slide: SLIDES[2] },
];

interface Props { onDone: () => void }

export default function OnboardingScreen({ onDone }: Props) {
    const { t } = useTranslation();
    const { theme, mode, setMode } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [index, setIndex] = useState(0);
    const step = STEPS[index];
    const slide = step.kind === 'slide' ? step.slide : SLIDES[0];
    const isLast = index === STEPS.length - 1;

    const handleDone = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
        onDone();
    };

    const goNext = () => {
        if (isLast) { handleDone(); return; }
        setIndex(i => i + 1);
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.skip} onPress={handleDone} accessibilityRole="button">
                <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>

            {step.kind === 'slide' ? (
                <View style={styles.slideArea}>
                    <View style={[styles.iconCircle, { backgroundColor: `${slide.color}22` }]}>
                        <Ionicons name={slide.icon} size={72} color={slide.color} />
                    </View>
                    <Text style={styles.title}>{t(slide.titleKey)}</Text>
                    <Text style={styles.body}>{t(slide.bodyKey)}</Text>
                </View>
            ) : (
                /* Tema seçimi — dokununca anında uygulanır, seçmeden de geçilebilir */
                <View style={styles.slideArea}>
                    <Text style={styles.title}>{t('onboarding.theme_title', 'Koyu mu,\naçık mı?')}</Text>
                    <Text style={styles.body}>{t('onboarding.theme_body', 'Şimdi seç ya da geç — istediğin zaman Ayarlar\'dan değiştirebilirsin.')}</Text>
                    <View style={styles.themeRow}>
                        <TouchableOpacity
                            style={[styles.themeCard, styles.themeCardDark, mode === 'dark' && styles.themeCardSelected]}
                            onPress={() => setMode('dark')}
                            activeOpacity={0.85}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: mode === 'dark' }}
                            accessibilityLabel={t('settings.theme_dark', 'Koyu')}
                        >
                            <Ionicons name="moon" size={36} color="#A5B4FC" />
                            <Text style={styles.themeCardTextDark}>{t('settings.theme_dark', 'Koyu')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.themeCard, styles.themeCardLight, mode === 'light' && styles.themeCardSelected]}
                            onPress={() => setMode('light')}
                            activeOpacity={0.85}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: mode === 'light' }}
                            accessibilityLabel={t('settings.theme_light', 'Açık')}
                        >
                            <Ionicons name="sunny" size={36} color="#F59E0B" />
                            <Text style={styles.themeCardTextLight}>{t('settings.theme_light', 'Açık')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {STEPS.map((_, i) => (
                        <View key={i} style={[styles.dot, i === index && { width: 24, backgroundColor: theme.colors.primary }]} />
                    ))}
                </View>
                <TouchableOpacity style={[styles.nextBtn, { shadowColor: slide.color }]} onPress={goNext} activeOpacity={0.85} accessibilityRole="button">
                    <Text style={styles.nextBtnText}>
                        {isLast ? t('onboarding.start') : t('onboarding.next')}
                    </Text>
                    <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        skip: {
            alignSelf: 'flex-end',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            minHeight: 44,
            justifyContent: 'center',
        },
        skipText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },

        slideArea: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.xl,
        },
        iconCircle: {
            width: 160,
            height: 160,
            borderRadius: 80,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.xl,
        },
        title: {
            fontSize: 28,
            fontWeight: '900',
            color: theme.colors.text,
            textAlign: 'center',
            lineHeight: 36,
            marginBottom: theme.spacing.md,
        },
        body: {
            fontSize: 16,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            fontWeight: '500',
            maxWidth: width - theme.spacing.xl * 2,
        },

        footer: {
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.lg,
            alignItems: 'center',
        },
        dots: { flexDirection: 'row', gap: 8 },
        dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.surfaceBorder,
        },
        nextBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            backgroundColor: theme.colors.primary,
            paddingVertical: 17,
            borderRadius: 16,
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
        },
        nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

        themeRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl },
        themeCard: {
            flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
            paddingVertical: theme.spacing.xl, borderRadius: theme.borderRadius.lg,
            borderWidth: 2, borderColor: 'transparent', minHeight: 120,
        },
        themeCardDark: { backgroundColor: '#1A1A2E', borderColor: 'rgba(255,255,255,0.12)' },
        themeCardLight: { backgroundColor: '#F5F3FF', borderColor: 'rgba(99,102,241,0.2)' },
        themeCardSelected: { borderColor: theme.colors.primary, borderWidth: 2.5 },
        themeCardTextDark: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
        themeCardTextLight: { color: '#12082E', fontSize: 16, fontWeight: '800' },
    });
}
