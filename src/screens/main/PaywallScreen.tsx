import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert,
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

const FEATURES = [
    { icon: 'infinite-outline', key: 'unlimited_lists' },
    { icon: 'ban-outline', key: 'no_ads' },
    { icon: 'color-palette-outline', key: 'themes' },
    { icon: 'cloud-upload-outline', key: 'cloud_sync' },
    { icon: 'share-social-outline', key: 'no_watermark' },
    { icon: 'layers-outline', key: 'all_content' },
    { icon: 'time-outline', key: 'extended_history' },
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

        planRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
        planCard: {
            flex: 1, borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 2, borderColor: theme.colors.surfaceBorder,
            padding: theme.spacing.md, alignItems: 'center',
            minHeight: 160,
        },
        planCardActive: {
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}14`,
            ...theme.colors.cardShadow,
        },
        planBadgeRow: { height: 22, marginBottom: 6, justifyContent: 'center' },
        bestValueBadge: {
            backgroundColor: theme.colors.primary, borderRadius: 20,
            paddingHorizontal: 10, paddingVertical: 2,
        },
        bestValueText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
        planLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 },
        planLabelActive: { color: theme.colors.primary },
        planPrice: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
        planPriceActive: { color: theme.colors.primary },
        planSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },
        planSavings: { fontSize: 11, color: theme.colors.success, fontWeight: '700', marginTop: 4, textAlign: 'center' },
        selectedDot: { position: 'absolute', top: 10, right: 10 },

        trialNote: {
            textAlign: 'center', color: theme.colors.textSecondary,
            fontSize: 12, marginBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.md, fontWeight: '500',
        },
        ctaBtn: {
            backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md + 2, alignItems: 'center',
            marginBottom: theme.spacing.md,
            shadowColor: theme.colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            elevation: 8,
        },
        ctaBtnDisabled: { opacity: 0.7 },
        ctaText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },

        trustCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            paddingVertical: 10, paddingHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.md, gap: 8,
        },
        trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        trustText: { flex: 1, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },

        legalText: {
            textAlign: 'center', color: theme.colors.textSecondary,
            fontSize: 10, marginBottom: theme.spacing.md, opacity: 0.8,
            paddingHorizontal: theme.spacing.lg, lineHeight: 15,
        },
        restoreBtn: { alignItems: 'center', paddingVertical: theme.spacing.sm },
        restoreText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },
    });
}

export default function PaywallScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { isPro, isLoading, purchaseMonthly, purchaseYearly, restorePurchases } = usePro();
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Close */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
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

                {/* Feature list */}
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

                {/* Plan selector */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 200 }}
                    style={styles.planRow}
                >
                    {/* Yearly — default */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
                        onPress={() => { setSelectedPlan('yearly'); Haptics.selectionAsync(); }}
                        activeOpacity={0.85}
                    >
                        <View style={styles.planBadgeRow}>
                            <View style={styles.bestValueBadge}>
                                <Text style={styles.bestValueText}>{t('paywall.best_value')}</Text>
                            </View>
                        </View>
                        <Text style={[styles.planLabel, selectedPlan === 'yearly' && styles.planLabelActive]}>
                            {t('paywall.yearly')}
                        </Text>
                        <Text style={[styles.planPrice, selectedPlan === 'yearly' && styles.planPriceActive]}>
                            $7.99
                        </Text>
                        <Text style={styles.planSub}>{t('paywall.yearly_per_month')}</Text>
                        <Text style={styles.planSavings}>{t('paywall.savings_67')}</Text>
                        {selectedPlan === 'yearly' && (
                            <View style={styles.selectedDot}>
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Monthly */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
                        onPress={() => { setSelectedPlan('monthly'); Haptics.selectionAsync(); }}
                        activeOpacity={0.85}
                    >
                        <View style={styles.planBadgeRow} />
                        <Text style={[styles.planLabel, selectedPlan === 'monthly' && styles.planLabelActive]}>
                            {t('paywall.monthly')}
                        </Text>
                        <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceActive]}>
                            $1.99
                        </Text>
                        <Text style={styles.planSub}>{t('paywall.monthly_billed')}</Text>
                        {selectedPlan === 'monthly' && (
                            <View style={styles.selectedDot}>
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                            </View>
                        )}
                    </TouchableOpacity>
                </MotiView>

                {/* Trial note */}
                <Text style={styles.trialNote}>{t('paywall.trial_note')}</Text>

                {/* CTA */}
                <TouchableOpacity
                    style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
                    onPress={handlePurchase}
                    disabled={purchasing || isLoading}
                    activeOpacity={0.9}
                >
                    {purchasing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.ctaText}>
                            {selectedPlan === 'yearly'
                                ? t('paywall.cta_yearly')
                                : t('paywall.cta_monthly')}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Trust signals */}
                <View style={styles.trustCard}>
                    <View style={styles.trustRow}>
                        <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
                        <Text style={styles.trustText}>{t('paywall.secure_payment')}</Text>
                    </View>
                    <View style={styles.trustRow}>
                        <Ionicons name="hand-left-outline" size={16} color={theme.colors.success} />
                        <Text style={styles.trustText}>{t('paywall.cancel_anytime')}</Text>
                    </View>
                </View>

                {/* Legal */}
                <Text style={styles.legalText}>{t('paywall.legal')}</Text>

                {/* Restore */}
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
