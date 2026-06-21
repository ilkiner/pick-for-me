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

interface Props { onDone: () => void }

export default function OnboardingScreen({ onDone }: Props) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [index, setIndex] = useState(0);
    const slide = SLIDES[index];
    const isLast = index === SLIDES.length - 1;

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

            <View style={styles.slideArea}>
                <View style={[styles.iconCircle, { backgroundColor: `${slide.color}22` }]}>
                    <Ionicons name={slide.icon} size={72} color={slide.color} />
                </View>
                <Text style={styles.title}>{t(slide.titleKey)}</Text>
                <Text style={styles.body}>{t(slide.bodyKey)}</Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
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
    });
}
