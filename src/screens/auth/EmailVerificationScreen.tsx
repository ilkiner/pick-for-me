import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../storage/supabase';
import { Theme } from '../../core/Theme';

export default function EmailVerificationScreen({ route, navigation }: any) {
    const { t } = useTranslation();
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
                        <Ionicons name="mail-outline" size={40} color={Theme.colors.secondary} />
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
                        ? <ActivityIndicator color={Theme.colors.primary} size="small" />
                        : <Text style={[styles.resendText, resent && styles.resendTextDone]}>
                            {resent ? t('auth.verify_resent') : t('auth.verify_resend')}
                          </Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.loginBtnText}>{t('auth.back_to_login')}</Text>
                </TouchableOpacity>
            </MotiView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    inner: { flex: 1, justifyContent: 'center', padding: Theme.spacing.lg },
    iconArea: { alignItems: 'center', marginBottom: Theme.spacing.xl },
    iconCircle: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 26, fontWeight: '800', color: Theme.colors.text, marginBottom: Theme.spacing.sm, textAlign: 'center' },
    subtitle: { fontSize: 15, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Theme.spacing.xl },
    stepsBox: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        padding: Theme.spacing.lg,
        marginBottom: Theme.spacing.xl,
        gap: Theme.spacing.md,
    },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md },
    stepNum: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(99,102,241,0.15)',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    stepNumText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 13 },
    stepText: { flex: 1, color: Theme.colors.text, fontSize: 14, lineHeight: 20 },
    resendBtn: {
        borderWidth: 1, borderColor: Theme.colors.primary,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center', justifyContent: 'center',
        minHeight: 48, marginBottom: Theme.spacing.md,
    },
    resendBtnDone: { borderColor: Theme.colors.success },
    resendText: { color: Theme.colors.primary, fontWeight: '600', fontSize: 15 },
    resendTextDone: { color: Theme.colors.success },
    loginBtn: {
        alignItems: 'center', justifyContent: 'center', minHeight: 48,
    },
    loginBtnText: { color: Theme.colors.textSecondary, fontSize: 15 },
});
