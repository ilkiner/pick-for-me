import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../storage/supabase';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        inner: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
        iconArea: { alignItems: 'center', marginBottom: theme.spacing.xl },
        iconCircle: {
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            alignItems: 'center', justifyContent: 'center',
        },
        title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.sm, textAlign: 'center' },
        subtitle: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.xl },
        stepsBox: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            padding: theme.spacing.lg, marginBottom: theme.spacing.xl,
            gap: theme.spacing.md,
        },
        stepRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
        stepNum: {
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: 'rgba(99,102,241,0.15)',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        },
        stepNumText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
        stepText: { flex: 1, color: theme.colors.text, fontSize: 14, lineHeight: 20 },
        resendBtn: {
            borderWidth: 1, borderColor: theme.colors.primary,
            borderRadius: theme.borderRadius.md,
            alignItems: 'center', justifyContent: 'center',
            minHeight: 48, marginBottom: theme.spacing.md,
        },
        resendBtnDone: { borderColor: theme.colors.success },
        resendText: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },
        resendTextDone: { color: theme.colors.success },
        loginBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
        loginBtnText: { color: theme.colors.textSecondary, fontSize: 15 },
    });
}

export default function EmailVerificationScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const email: string = route?.params?.email ?? '';
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    const handleResend = async () => {
        if (resending || resent) return;
        setResending(true);
        await supabase.auth.resend({ type: 'signup', email });
        setResending(false);
        setResent(true);
        setTimeout(() => setResent(false), 5000);
    };

    return (
        <SafeAreaView style={styles.container}>
            <MotiView
                from={{ opacity: 0, translateY: 24 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 450 }}
                style={styles.inner}
            >
                <View style={styles.iconArea}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="mail-outline" size={40} color={theme.colors.secondary} />
                    </View>
                </View>

                <Text style={styles.title}>{t('auth.verify_title')}</Text>
                <Text style={styles.subtitle}>
                    {t('auth.verify_sub', { email: email || t('auth.your_email') })}
                </Text>

                <View style={styles.stepsBox}>
                    {[
                        t('auth.verify_step1'),
                        t('auth.verify_step2'),
                        t('auth.verify_step3'),
                    ].map((step, i) => (
                        <View key={i} style={styles.stepRow}>
                            <View style={styles.stepNum}>
                                <Text style={styles.stepNumText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.resendBtn, resent && styles.resendBtnDone]}
                    onPress={handleResend}
                    disabled={resending || resent}
                >
                    {resending
                        ? <ActivityIndicator color={theme.colors.primary} size="small" />
                        : <Text style={[styles.resendText, resent && styles.resendTextDone]}>
                            {resent ? t('auth.verify_resent') : t('auth.verify_resend')}
                          </Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginBtnText}>{t('auth.back_to_login')}</Text>
                </TouchableOpacity>
            </MotiView>
        </SafeAreaView>
    );
}
