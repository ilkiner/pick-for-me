import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/GlassCard';
import { isSupabaseConfigured, supabase } from '../../storage/supabase';
import { usePro } from '../../store/ProContext';
import { useTheme, ThemeMode } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { useSound } from '../../store/SoundContext';

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
        title: { fontSize: 32, fontWeight: '800', color: theme.colors.text, letterSpacing: 0.5 },
        content: { flex: 1, padding: theme.spacing.md },
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
    });
}

const THEME_OPTIONS: { mode: ThemeMode; labelKey: string; icon: string }[] = [
    { mode: 'dark',   labelKey: 'settings.theme_dark',   icon: 'moon' },
    { mode: 'light',  labelKey: 'settings.theme_light',  icon: 'sunny' },
    { mode: 'system', labelKey: 'settings.theme_system', icon: 'phone-portrait' },
];

export default function SettingsScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { isPro, openPaywall, restorePurchases } = usePro();
    const { theme, mode, setMode } = useTheme();
    const { soundEnabled, setSoundEnabled } = useSound();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'tr' ? 'en' : 'tr';
        i18n.changeLanguage(nextLang);
    };

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

            <View style={styles.content}>
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
                                onPress={() => setMode(opt.mode)}
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
                            <Text style={styles.rowSubtitle}>{i18n.language === 'tr' ? 'Türkçe' : 'English'}</Text>
                        </View>
                        <TouchableOpacity style={styles.toggleBtn} onPress={toggleLanguage}>
                            <Text style={styles.toggleText}>{i18n.language === 'tr' ? 'EN' : 'TR'}</Text>
                        </TouchableOpacity>
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

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Pick For Me v1.0.0</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
