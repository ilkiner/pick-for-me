import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/GlassCard';
import { isSupabaseConfigured, supabase } from '../../storage/supabase';
import { usePro } from '../../store/ProContext';
import { useTheme, ThemeMode } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { useSound } from '../../store/SoundContext';
import { track } from '../../core/Analytics';

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
        title: { fontSize: 32, fontWeight: '800', color: theme.colors.text, letterSpacing: 0.5 },
        content: { flexGrow: 1, padding: theme.spacing.md },
        section: { marginBottom: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg },
        proSection: { borderColor: 'rgba(255,215,0,0.3)', borderWidth: 1 },
        row: { flexDirection: 'row', alignItems: 'center' },
        iconWrapper: {
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: theme.colors.surface,
            alignItems: 'center', justifyContent: 'center',
            marginRight: theme.spacing.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
        },
        rowContent: { flex: 1 },
        rowTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
        rowSubtitle: { fontSize: 13, color: theme.colors.textSecondary },
        toggleBtn: {
            backgroundColor: theme.colors.primary, paddingHorizontal: 16,
            borderRadius: 8, minWidth: 44, minHeight: 44,
            alignItems: 'center', justifyContent: 'center',
        },
        toggleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
        versionContainer: { marginTop: 'auto', alignItems: 'center', paddingBottom: theme.spacing.xl },
        versionText: { color: theme.colors.textSecondary, fontSize: 12, letterSpacing: 1 },
        // Theme segment
        segmentRow: { flexDirection: 'row', marginTop: theme.spacing.sm, gap: 6 },
        segBtn: {
            flex: 1, paddingVertical: 10, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
        },
        segBtnActive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        segBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
        segBtnTextActive: { color: '#FFFFFF' },
        segFlag: { fontSize: 16, marginBottom: 2 },
        devSection: { borderColor: 'rgba(245,158,11,0.35)', borderWidth: 1 },
        devBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
        devBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    });
}

const THEME_OPTIONS: { mode: ThemeMode; labelKey: string; icon: string }[] = [
    { mode: 'dark',   labelKey: 'settings.theme_dark',   icon: 'moon' },
    { mode: 'light',  labelKey: 'settings.theme_light',  icon: 'sunny' },
    { mode: 'system', labelKey: 'settings.theme_system', icon: 'phone-portrait' },
];

const LANGUAGE_OPTIONS: { code: string; label: string; flag: string }[] = [
    { code: 'tr', label: 'Türkçe',  flag: '🇹🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'pl', label: 'Polski',  flag: '🇵🇱' },
];

export default function SettingsScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { isPro, openPaywall, restorePurchases, devProOverride, devTogglePro } = usePro();
    const { theme, mode, setMode } = useTheme();
    const { soundEnabled, setSoundEnabled } = useSound();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const handleLogout = async () => {
        if (!isSupabaseConfigured()) {
            Alert.alert(
                t('settings.logout', 'Çıkış Yap'),
                t('settings.logout_demo', 'Demo modunda oturum zaten açık değil.'),
                [{ text: t('common.ok', 'Tamam') }]
            );
            return;
        }
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    const handleRestore = async () => {
        const success = await restorePurchases();
        if (success) {
            Alert.alert(t('paywall.restore_success_title'), t('paywall.restore_success_msg'));
        } else {
            Alert.alert(t('paywall.restore_none_title'), t('paywall.restore_none_msg'));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('settings.title', 'Ayarlar')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Subscription status */}
                <GlassCard style={[styles.section, isPro && styles.proSection] as any}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={isPro ? undefined : openPaywall}
                        activeOpacity={isPro ? 1 : 0.7}
                    >
                        <View style={[styles.iconWrapper, { backgroundColor: isPro ? 'rgba(255,215,0,0.15)' : 'rgba(99,102,241,0.1)' }]}>
                            <Ionicons name={isPro ? 'diamond' : 'diamond-outline'} size={22} color={isPro ? '#FFD700' : theme.colors.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, isPro && { color: '#FFD700' }]}>
                                {isPro ? t('settings.pro_active') : t('settings.go_pro')}
                            </Text>
                            <Text style={styles.rowSubtitle}>
                                {isPro ? t('settings.pro_active_desc') : t('settings.go_pro_desc')}
                            </Text>
                        </View>
                        {!isPro && <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />}
                        {isPro && <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />}
                    </TouchableOpacity>
                </GlassCard>

                {/* Theme */}
                <GlassCard style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="contrast-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>{t('settings.theme', 'Tema')}</Text>
                        </View>
                    </View>
                    <View style={styles.segmentRow}>
                        {THEME_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.mode}
                                style={[styles.segBtn, mode === opt.mode && styles.segBtnActive]}
                                onPress={() => { setMode(opt.mode); track('theme_changed', { theme: opt.mode }); }}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={opt.icon as any}
                                    size={16}
                                    color={mode === opt.mode ? '#FFFFFF' : theme.colors.textSecondary}
                                />
                                <Text style={[styles.segBtnText, mode === opt.mode && styles.segBtnTextActive]}>
                                    {t(opt.labelKey, opt.mode)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </GlassCard>

                {/* Language */}
                <GlassCard style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="language" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>{t('settings.language', 'Dil')}</Text>
                        </View>
                    </View>
                    <View style={styles.segmentRow}>
                        {LANGUAGE_OPTIONS.map(lang => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[styles.segBtn, i18n.language === lang.code && styles.segBtnActive]}
                                onPress={() => i18n.changeLanguage(lang.code)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.segFlag}>{lang.flag}</Text>
                                <Text style={[styles.segBtnText, i18n.language === lang.code && styles.segBtnTextActive]}>
                                    {lang.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </GlassCard>

                {/* Sound effects */}
                <GlassCard style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="musical-notes-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>{t('settings.sound', 'Ses efektleri')}</Text>
                            <Text style={styles.rowSubtitle}>{t('settings.sound_desc', 'Çark, zar, tura sesleri')}</Text>
                        </View>
                        <Switch
                            value={soundEnabled}
                            onValueChange={setSoundEnabled}
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </GlassCard>

                {/* Restore purchases */}
                <GlassCard style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={handleRestore}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="refresh-circle-outline" size={22} color={theme.colors.accent} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>{t('settings.restore')}</Text>
                            <Text style={styles.rowSubtitle}>{t('settings.restore_desc')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.surfaceBorder} />
                    </TouchableOpacity>
                </GlassCard>

                {/* Logout */}
                <GlassCard style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={handleLogout}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Ionicons name="log-out" size={22} color={theme.colors.error} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.colors.error }]}>{t('settings.logout', 'Çıkış Yap')}</Text>
                            <Text style={styles.rowSubtitle}>{t('settings.logout_desc', 'Oturumu sonlandır')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.surfaceBorder} />
                    </TouchableOpacity>
                </GlassCard>

                {/* DEV ONLY — Pro/Free test switch (stripped from production builds) */}
                {__DEV__ && (
                    <GlassCard style={[styles.section, styles.devSection] as any}>
                        <TouchableOpacity style={styles.row} onPress={devTogglePro}>
                            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                                <Ionicons name="construct" size={22} color="#F59E0B" />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={[styles.rowTitle, { color: '#F59E0B' }]}>
                                    DEV: {devProOverride === null ? 'Gerçek durum' : devProOverride ? 'PRO (zorlandı)' : 'ÜCRETSİZ (zorlandı)'}
                                </Text>
                                <Text style={styles.rowSubtitle}>Dokun: Pro → Ücretsiz → Gerçek</Text>
                            </View>
                            <View style={[styles.devBadge, { backgroundColor: devProOverride === true ? 'rgba(16,185,129,0.15)' : devProOverride === false ? 'rgba(239,68,68,0.15)' : theme.colors.surface }]}>
                                <Text style={[styles.devBadgeText, { color: devProOverride === true ? theme.colors.success : devProOverride === false ? theme.colors.error : theme.colors.textSecondary }]}>
                                    {devProOverride === true ? 'PRO' : devProOverride === false ? 'FREE' : 'AUTO'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </GlassCard>
                )}

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Pick For Me v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
