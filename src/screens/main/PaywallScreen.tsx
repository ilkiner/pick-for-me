import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { AppTheme } from '../../core/Theme';
import { track } from '../../core/Analytics';
import { useTheme } from '../../store/ThemeContext';
import { usePro } from '../../store/ProContext';

type Plan = 'monthly' | 'yearly';

const PRIVACY_URL = 'https://ilkiner.github.io/pick-for-me/privacy-policy.html';
const TERMS_URL = 'https://ilkiner.github.io/pick-for-me/terms.html';

// ─── Fiyatlandırma ────────────────────────────────────────────────────────────
// Fiyatlar koda gömülmez: RevenueCat offerings'ten okunur (kullanıcının mağaza
// para birimiyle gelir). Mağaza yüklenemezse aşağıdaki fallback'ler kullanılır.
export interface Pricing {
    yearly: string;      // ör. "$7.99" — yıllık fiyat (priceString)
    monthly: string;     // ör. "$1.99" — aylık fiyat (priceString)
    perMonth: string;    // yıllık/12 — "ayda sadece X" satırı
    anchor: string;      // aylık×12 — üstü çizili çapa fiyatı
    savingsPct: number;  // 1 - yıllık/(aylık×12)
}

const FALLBACK_PRICING: Pricing = {
    yearly: '$7.99',
    monthly: '$1.99',
    perMonth: '$0.67',
    anchor: '$23.88',
    savingsPct: 67,
};

// priceString kalıbındaki sayıyı yeni değerle değiştirir; böylece hesaplanan
// tutarlar (aylık eşdeğer, çapa) kullanıcının para birimi simgesi/formatıyla
// gösterilir. Not: binlik ayraçlı çok büyük tutarlarda ayraç korunmaz — bu
// ekrandaki küçük tutarlar için yeterli.
function formatWithSameCurrency(template: string, value: number): string {
    const usesComma = /\d,\d{2}(?!\d)/.test(template);
    const num = usesComma ? value.toFixed(2).replace('.', ',') : value.toFixed(2);
    return template.replace(/\d[\d.,\s]*\d|\d/, num);
}

function derivePricing(offerings: any): Pricing {
    try {
        const annualPkg = offerings?.annual
            ?? offerings?.availablePackages?.find((p: any) => p.packageType === 'ANNUAL');
        const monthlyPkg = offerings?.monthly
            ?? offerings?.availablePackages?.find((p: any) => p.packageType === 'MONTHLY');
        const y = annualPkg?.product;
        const m = monthlyPkg?.product;
        if (!y?.priceString || !m?.priceString || !y.price || !m.price) return FALLBACK_PRICING;

        const anchorVal = m.price * 12;
        return {
            yearly: y.priceString,
            monthly: m.priceString,
            perMonth: formatWithSameCurrency(y.priceString, y.price / 12),
            anchor: formatWithSameCurrency(m.priceString, anchorVal),
            savingsPct: Math.round((1 - y.price / anchorVal) * 100),
        };
    } catch {
        return FALLBACK_PRICING;
    }
}

const FEATURES = [
    { icon: 'ban-outline', key: 'no_ads' },
    { icon: 'infinite-outline', key: 'unlimited_lists' },
    { icon: 'color-palette-outline', key: 'themes' },
    { icon: 'cloud-upload-outline', key: 'cloud_sync' },
    { icon: 'share-social-outline', key: 'no_watermark' },
    { icon: 'layers-outline', key: 'all_content' },
];

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        scroll: { padding: theme.spacing.md, paddingBottom: 40 },
        header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: theme.spacing.sm },
        closeBtn: {
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            alignItems: 'center', justifyContent: 'center',
        },
        alreadyProContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
        alreadyProTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginTop: theme.spacing.md, textAlign: 'center', letterSpacing: -0.4 },
        alreadyProSub: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },

        hero: { alignItems: 'center', paddingVertical: theme.spacing.lg },
        heroIconContainer: {
            width: 84, height: 84, borderRadius: 42,
            backgroundColor: `${theme.colors.primary}1A`,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: theme.spacing.md,
            borderWidth: 1, borderColor: `${theme.colors.primary}40`,
            shadowColor: theme.colors.primary, shadowOpacity: 0.45, shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 }, elevation: 8,
        },
        heroTitle: { fontSize: 27, fontWeight: '800', color: theme.colors.text, textAlign: 'center', letterSpacing: -0.6 },
        heroSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 20 },

        featuresCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            marginBottom: theme.spacing.lg,
            overflow: 'hidden',
            ...theme.colors.cardShadow,
        },
        featureRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: 13, gap: 12 },
        featureRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.surfaceBorder },
        featureIconWrap: {
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: `${theme.colors.primary}1F`,
            alignItems: 'center', justifyContent: 'center',
        },
        featureText: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600' },

        // Plan kartları — alt alta
        planCard: {
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 2, borderColor: theme.colors.surfaceBorder,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
        },
        planCardActive: {
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}14`,
            ...theme.colors.cardShadow,
        },
        planTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        radioOuter: {
            width: 22, height: 22, borderRadius: 11,
            borderWidth: 2, borderColor: theme.colors.surfaceBorder,
            alignItems: 'center', justifyContent: 'center',
        },
        radioOuterActive: { borderColor: theme.colors.primary },
        radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary },
        planLabel: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
        saveBadge: {
            backgroundColor: theme.colors.success, borderRadius: 20,
            paddingHorizontal: 10, paddingVertical: 3, marginLeft: 'auto',
        },
        saveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
        planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10, marginLeft: 32 },
        anchorPrice: {
            fontSize: 15, color: theme.colors.textSecondary,
            textDecorationLine: 'line-through', marginBottom: 4, opacity: 0.8,
        },
        planPrice: { fontSize: 30, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
        planPeriod: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 5 },
        perMonthText: { fontSize: 13, color: theme.colors.success, fontWeight: '700', marginTop: 4, marginLeft: 32 },
        planSubText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, marginLeft: 32 },

        trialBadgeWrap: { alignItems: 'center', marginTop: 4, marginBottom: theme.spacing.md },
        trialBadge: {
            backgroundColor: `${theme.colors.success}1F`,
            borderWidth: 1, borderColor: `${theme.colors.success}55`,
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
        },
        trialBadgeText: { color: theme.colors.success, fontSize: 13, fontWeight: '800' },

        ctaBtn: {
            backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md + 2, alignItems: 'center',
            marginBottom: theme.spacing.sm,
            shadowColor: theme.colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            elevation: 8,
        },
        ctaBtnDisabled: { opacity: 0.7 },
        ctaText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
        ctaNote: {
            textAlign: 'center', color: theme.colors.textSecondary,
            fontSize: 12, marginBottom: theme.spacing.md, fontWeight: '500',
            paddingHorizontal: theme.spacing.md,
        },

        trustLine: {
            textAlign: 'center', color: theme.colors.textSecondary,
            fontSize: 13, fontWeight: '600', marginBottom: theme.spacing.md,
        },

        legalText: {
            textAlign: 'center', color: theme.colors.textSecondary,
            fontSize: 10, marginBottom: theme.spacing.sm, opacity: 0.8,
            paddingHorizontal: theme.spacing.lg, lineHeight: 15,
        },
        linksRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
        linkText: { color: theme.colors.primary, fontSize: 12, fontWeight: '600', padding: 4 },
        linkDot: { color: theme.colors.textSecondary, fontSize: 12 },

        restoreBtn: { alignItems: 'center', paddingVertical: theme.spacing.md, minHeight: 44 },
        restoreText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
    });
}

export default function PaywallScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { isPro, isLoading, offerings, purchaseMonthly, purchaseYearly, restorePurchases } = usePro();
    const pricing = useMemo(() => derivePricing(offerings), [offerings]);
    const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

    React.useEffect(() => { track('paywall_viewed'); }, []);

    if (isPro) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.alreadyProContainer}>
                    <Ionicons name="checkmark-circle" size={72} color={theme.colors.success} />
                    <Text style={styles.alreadyProTitle}>{t('paywall.already_pro')}</Text>
                    <Text style={styles.alreadyProSub}>{t('paywall.enjoy')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const handlePurchase = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPurchasing(true);
        try {
            const success = selectedPlan === 'yearly'
                ? await purchaseYearly()
                : await purchaseMonthly();
            if (success) {
                track('subscription_started', { plan: selectedPlan });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                navigation.goBack();
            }
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setRestoring(true);
        try {
            const success = await restorePurchases();
            if (success) {
                Alert.alert(t('paywall.restore_success_title'), t('paywall.restore_success_msg'));
                navigation.goBack();
            } else {
                Alert.alert(t('paywall.restore_none_title'), t('paywall.restore_none_msg'));
            }
        } finally {
            setRestoring(false);
        }
    };

    const selectPlan = (plan: Plan) => {
        setSelectedPlan(plan);
        Haptics.selectionAsync();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Kapat (X) */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.closeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.back', 'Geri')}
                    >
                        <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Hero */}
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    style={styles.hero}
                >
                    <View style={styles.heroIconContainer}>
                        <Ionicons name="sparkles" size={42} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>{t('paywall.hero_title')}</Text>
                    <Text style={styles.heroSub}>{t('paywall.hero_sub')}</Text>
                </MotiView>

                {/* Özellik kartı — 6 satır */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 100 }}
                    style={styles.featuresCard}
                >
                    {FEATURES.map((f, i) => (
                        <View key={f.key} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
                            <View style={styles.featureIconWrap}>
                                <Ionicons name={f.icon as any} size={18} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.featureText}>{t(`paywall.feature_${f.key}`)}</Text>
                            <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                        </View>
                    ))}
                </MotiView>

                {/* Plan kartları — alt alta, yıllık üstte */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 200 }}
                >
                    {/* Yıllık — varsayılan seçili */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
                        onPress={() => selectPlan('yearly')}
                        activeOpacity={0.85}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedPlan === 'yearly' }}
                        accessibilityLabel={t('paywall.yearly')}
                    >
                        <View style={styles.planTopRow}>
                            <View style={[styles.radioOuter, selectedPlan === 'yearly' && styles.radioOuterActive]}>
                                {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.planLabel}>{t('paywall.yearly')}</Text>
                            <View style={styles.saveBadge}>
                                <Text style={styles.saveBadgeText}>
                                    {t('paywall.save_badge', { pct: pricing.savingsPct })}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.planPriceRow}>
                            <Text style={styles.anchorPrice}>{pricing.anchor}</Text>
                            <Text style={styles.planPrice}>{pricing.yearly}</Text>
                            <Text style={styles.planPeriod}>{t('paywall.per_year')}</Text>
                        </View>
                        <Text style={styles.perMonthText}>
                            {t('paywall.per_month_only', { price: pricing.perMonth })}
                        </Text>
                    </TouchableOpacity>

                    {/* Aylık */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
                        onPress={() => selectPlan('monthly')}
                        activeOpacity={0.85}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedPlan === 'monthly' }}
                        accessibilityLabel={t('paywall.monthly')}
                    >
                        <View style={styles.planTopRow}>
                            <View style={[styles.radioOuter, selectedPlan === 'monthly' && styles.radioOuterActive]}>
                                {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.planLabel}>{t('paywall.monthly')}</Text>
                        </View>
                        <View style={styles.planPriceRow}>
                            <Text style={styles.planPrice}>{pricing.monthly}</Text>
                            <Text style={styles.planPeriod}>{t('paywall.per_month')}</Text>
                        </View>
                        <Text style={styles.planSubText}>{t('paywall.monthly_billed')}</Text>
                    </TouchableOpacity>
                </MotiView>

                {/* Deneme rozeti + CTA */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 300 }}
                >
                    <View style={styles.trialBadgeWrap}>
                        <View style={styles.trialBadge}>
                            <Text style={styles.trialBadgeText}>{t('paywall.trial_badge')}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
                        onPress={handlePurchase}
                        disabled={purchasing || isLoading}
                        activeOpacity={0.9}
                        accessibilityRole="button"
                        accessibilityLabel={t('paywall.cta_trial')}
                    >
                        {purchasing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.ctaText}>{t('paywall.cta_trial')}</Text>
                        )}
                    </TouchableOpacity>
                </MotiView>
                <Text style={styles.ctaNote}>
                    {selectedPlan === 'yearly'
                        ? t('paywall.cta_note_yearly', { price: pricing.yearly })
                        : t('paywall.cta_note_monthly', { price: pricing.monthly })}
                </Text>

                {/* Güven satırı */}
                <Text style={styles.trustLine}>{t('paywall.trust_line')}</Text>

                {/* Yasal */}
                <Text style={styles.legalText}>{t('paywall.legal')}</Text>

                {/* Linkler */}
                <View style={styles.linksRow}>
                    <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
                        <Text style={styles.linkText}>{t('paywall.privacy')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.linkDot}>•</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>
                        <Text style={styles.linkText}>{t('paywall.terms')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Geri yükle — en altta, görünür */}
                <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                    {restoring
                        ? <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        : <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
