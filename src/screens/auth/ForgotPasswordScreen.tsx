import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../storage/supabase';
import { Theme } from '../../core/Theme';

export default function ForgotPasswordScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async () => {
        if (!email.trim()) {
            setError(t('auth.email_required'));
            return;
        }
        setLoading(true);
        setError('');
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: 'pickforme://reset-password',
        });
        if (authError) {
            setError(authError.message);
        } else {
            setSent(true);
        }
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
                    </TouchableOpacity>

                    <MotiView
                        from={{ opacity: 0, translateY: 24 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 450 }}
                        style={styles.inner}
                    >
                        <View style={styles.iconArea}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="lock-open-outline" size={36} color={Theme.colors.primary} />
                            </View>
                        </View>

                        <Text style={styles.title}>{t('auth.forgot_title')}</Text>
                        <Text style={styles.subtitle}>{t('auth.forgot_subtitle')}</Text>

                        {sent ? (
                            <MotiView
                                from={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={styles.successBox}
                            >
                                <Ionicons name="checkmark-circle" size={32} color={Theme.colors.success} />
                                <Text style={styles.successText}>{t('auth.forgot_sent')}</Text>
                                <Text style={styles.successSub}>{t('auth.forgot_sent_sub')}</Text>
                            </MotiView>
                        ) : (
                            <>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('login.email')}
                                    placeholderTextColor={Theme.colors.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoFocus
                                />

                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <TouchableOpacity
                                    style={[styles.button, loading && styles.buttonDisabled]}
                                    onPress={handleReset}
                                    disabled={loading}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.buttonText}>{t('auth.forgot_send')}</Text>
                                    }
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>{t('auth.back_to_login')}</Text>
                        </TouchableOpacity>
                    </MotiView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    backBtn: { padding: Theme.spacing.md, marginLeft: Theme.spacing.sm },
    inner: { flex: 1, padding: Theme.spacing.lg, paddingTop: Theme.spacing.sm },
    iconArea: { alignItems: 'center', marginBottom: Theme.spacing.xl },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    title: {
        fontSize: 28, fontWeight: '800', color: Theme.colors.text,
        marginBottom: Theme.spacing.sm,
    },
    subtitle: {
        fontSize: 15, color: Theme.colors.textSecondary,
        marginBottom: Theme.spacing.xl, lineHeight: 22,
    },
    input: {
        backgroundColor: Theme.colors.surface,
        color: Theme.colors.text,
        padding: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        marginBottom: Theme.spacing.md,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        fontSize: 16, minHeight: 52,
    },
    errorText: { color: Theme.colors.error, marginBottom: Theme.spacing.md, fontSize: 14, fontWeight: '500' },
    button: {
        backgroundColor: Theme.colors.primary,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center', justifyContent: 'center',
        minHeight: 52, marginTop: Theme.spacing.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    link: { marginTop: Theme.spacing.xl, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    linkText: { color: Theme.colors.primary, fontSize: 15, fontWeight: '600' },
    successBox: {
        alignItems: 'center', padding: Theme.spacing.xl,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        marginBottom: Theme.spacing.xl,
        gap: Theme.spacing.sm,
    },
    successText: { fontSize: 17, fontWeight: '700', color: Theme.colors.text, textAlign: 'center' },
    successSub: { fontSize: 14, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
