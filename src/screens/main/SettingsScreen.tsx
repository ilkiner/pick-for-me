import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { isSupabaseConfigured, supabase } from '../../storage/supabase';

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();

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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('settings.title', 'Ayarlar')}</Text>
            </View>

            <View style={styles.content}>
                <GlassCard style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="language" size={22} color={Theme.colors.primary} />
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

                <GlassCard style={styles.section}>
                    <TouchableOpacity style={styles.row} onPress={handleLogout}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Ionicons name="log-out" size={22} color={Theme.colors.error} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: Theme.colors.error }]}>{t('settings.logout', 'Çıkış Yap')}</Text>
                            <Text style={styles.rowSubtitle}>{t('settings.logout_desc', 'Oturumu sonlandır')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Theme.colors.surfaceBorder} />
                    </TouchableOpacity>
                </GlassCard>

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Pick For Me v1.0.0</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    header: {
        padding: Theme.spacing.lg,
        paddingBottom: Theme.spacing.md,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Theme.colors.text,
        letterSpacing: 0.5,
    },
    content: {
        flex: 1,
        padding: Theme.spacing.md,
    },
    section: {
        marginBottom: Theme.spacing.md,
        padding: Theme.spacing.md,
        borderRadius: Theme.borderRadius.lg,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Theme.spacing.md,
        borderWidth: 1,
        borderColor: Theme.colors.surfaceBorder,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Theme.colors.text,
        marginBottom: 2,
    },
    rowSubtitle: {
        fontSize: 13,
        color: Theme.colors.textSecondary,
    },
    toggleBtn: {
        backgroundColor: Theme.colors.primary,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    versionContainer: {
        marginTop: 'auto',
        alignItems: 'center',
        paddingBottom: Theme.spacing.xl,
    },
    versionText: {
        color: Theme.colors.textSecondary,
        fontSize: 12,
        letterSpacing: 1,
    }
});
