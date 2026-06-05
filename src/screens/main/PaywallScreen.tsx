import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../core/Theme';
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

export default function PaywallScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { isPro, isLoading, purchaseMonthly, purchaseYearly, restorePurchases } = usePro();
    const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

    if (isPro) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={Theme.colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.alreadyProContainer}>
                    <Ionicons name="checkmark-circle" size={72} color={Theme.colors.success} />
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
                        <Ionicons name="close" size={24} color={Theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Hero */}
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    style={styles.hero}
                >
                    <View style={styles.crownContainer}>
                        <Ionicons name="diamond" size={48} color="#FFD700" />
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
                                <Ionicons name={f.icon as any} size={20} color={Theme.colors.primary} />
                            </View>
                            <Text style={styles.featureText}>{t(`paywall.feature_${f.key}`)}</Text>
                            <Ionicons name="checkmark-circle" size={18} color={Theme.colors.success} />
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
                                <Ionicons name="checkmark-circle" size={20} color={Theme.colors.primary} />
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
                                <Ionicons name="checkmark-circle" size={20} color={Theme.colors.primary} />
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

                {/* Legal */}
                <Text style={styles.legalText}>{t('paywall.legal')}</Text>

                {/* Restore */}
                <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                    {restoring
                        ? <ActivityIndicator size="small" color={Theme.colors.textSecondary} />
                        : <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    scroll: { padding: Theme.spacing.md, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Theme.spacing.sm },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Theme.colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    alreadyProContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Theme.spacing.xl },
    alreadyProTitle: { fontSize: 24, fontWeight: '900', color: Theme.colors.text, marginTop: Theme.spacing.md, textAlign: 'center' },
    alreadyProSub: { fontSize: 15, color: Theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },

    hero: { alignItems: 'center', paddingVertical: Theme.spacing.lg },
    crownContainer: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: 'rgba(255,215,0,0.12)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Theme.spacing.md,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    },
    heroTitle: { fontSize: 26, fontWeight: '900', color: Theme.colors.text, textAlign: 'center', letterSpacing: 0.3 },
    heroSub: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 6, textAlign: 'center', maxWidth: 260 },

    featuresCard: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        marginBottom: Theme.spacing.lg,
        overflow: 'hidden',
    },
    featureRow: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md, gap: 12 },
    featureRowBorder: { borderTopWidth: 1, borderTopColor: Theme.colors.surfaceBorder },
    featureIconWrap: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(99,102,241,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    featureText: { flex: 1, color: Theme.colors.text, fontSize: 14, fontWeight: '600' },

    planRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginBottom: Theme.spacing.md },
    planCard: {
        flex: 1, borderRadius: Theme.borderRadius.lg,
        backgroundColor: Theme.colors.surface,
        borderWidth: 2, borderColor: Theme.colors.surfaceBorder,
        padding: Theme.spacing.md, alignItems: 'center',
        minHeight: 160,
    },
    planCardActive: { borderColor: Theme.colors.primary, backgroundColor: 'rgba(99,102,241,0.08)' },
    planBadgeRow: { height: 22, marginBottom: 6, justifyContent: 'center' },
    bestValueBadge: {
        backgroundColor: Theme.colors.primary, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 2,
    },
    bestValueText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    planLabel: { fontSize: 13, fontWeight: '700', color: Theme.colors.textSecondary, marginBottom: 4 },
    planLabelActive: { color: Theme.colors.primary },
    planPrice: { fontSize: 28, fontWeight: '900', color: Theme.colors.text },
    planPriceActive: { color: Theme.colors.primary },
    planSub: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },
    planSavings: { fontSize: 11, color: Theme.colors.success, fontWeight: '700', marginTop: 4, textAlign: 'center' },
    selectedDot: { position: 'absolute', top: 10, right: 10 },

    trialNote: {
        textAlign: 'center', color: Theme.colors.textSecondary,
        fontSize: 12, marginBottom: Theme.spacing.lg,
        paddingHorizontal: Theme.spacing.md,
    },
    ctaBtn: {
        backgroundColor: Theme.colors.primary, borderRadius: Theme.borderRadius.lg,
        padding: Theme.spacing.md + 2, alignItems: 'center',
        marginBottom: Theme.spacing.sm,
        shadowColor: Theme.colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    ctaBtnDisabled: { opacity: 0.7 },
    ctaText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    legalText: {
        textAlign: 'center', color: Theme.colors.textSecondary,
        fontSize: 10, marginBottom: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.lg, lineHeight: 15,
    },
    restoreBtn: { alignItems: 'center', paddingVertical: Theme.spacing.sm },
    restoreText: { color: Theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
