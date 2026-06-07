import React, { useState, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../../storage/supabase';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';

function mapAuthError(msg: string, t: (k: string) => string): string {
    if (msg.includes('Invalid login credentials')) return t('auth.error_invalid_credentials');
    if (msg.includes('Email not confirmed')) return t('auth.error_email_not_confirmed');
    if (msg.includes('Too many requests')) return t('auth.error_too_many_requests');
    return msg;
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        inner: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
        logoArea: { alignItems: 'center', marginBottom: theme.spacing.xxl },
        logoCircle: {
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: theme.spacing.md,
        },
        appName: { fontSize: 18, fontWeight: '900', color: theme.colors.text, letterSpacing: 3 },
        title: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.xl },
        demoBox: {
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: 'rgba(251,191,36,0.1)',
            borderRadius: theme.borderRadius.sm,
            borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
            padding: theme.spacing.sm, marginBottom: theme.spacing.md,
        },
        demoText: { flex: 1, color: theme.colors.accent, fontSize: 13, lineHeight: 18 },
        input: {
            backgroundColor: theme.colors.surface, color: theme.colors.text,
            padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            fontSize: 16, minHeight: 52,
        },
        pwWrapper: {
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            marginBottom: theme.spacing.sm, minHeight: 52,
        },
        pwInput: { flex: 1, color: theme.colors.text, padding: theme.spacing.md, fontSize: 16 },
        eyeBtn: { padding: theme.spacing.md },
        forgotLink: { alignSelf: 'flex-end', marginBottom: theme.spacing.md, minHeight: 36, justifyContent: 'center' },
        forgotText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },
        errorText: { color: theme.colors.error, marginBottom: theme.spacing.md, fontSize: 14, fontWeight: '500' },
        button: {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius.md,
            alignItems: 'center', justifyContent: 'center',
            minHeight: 52, marginTop: theme.spacing.sm,
        },
        buttonDisabled: { opacity: 0.6 },
        buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        link: { marginTop: theme.spacing.xl, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
        linkText: { color: theme.colors.primary, fontSize: 15, fontWeight: '600' },
    });
}

export default function LoginScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setError(t('login.error_required'));
            return;
        }
        setLoading(true);
        setError('');
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (authError) setError(mapAuthError(authError.message, t));
        setLoading(false);
    };

    const isDemoMode = !isSupabaseConfigured();

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <MotiView
                        from={{ opacity: 0, translateY: 24 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 450 }}
                        style={styles.inner}
                    >
                        <View style={styles.logoArea}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="shuffle" size={40} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.appName}>PICK FOR ME</Text>
                        </View>

                        <Text style={styles.title}>{t('login.title')}</Text>

                        {isDemoMode && (
                            <View style={styles.demoBox}>
                                <Ionicons name="information-circle-outline" size={16} color={theme.colors.accent} />
                                <Text style={styles.demoText}>{t('auth.demo_mode_hint')}</Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder={t('login.email')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            accessibilityLabel={t('login.email')}
                            returnKeyType="next"
                        />

                        <View style={styles.pwWrapper}>
                            <TextInput
                                style={styles.pwInput}
                                placeholder={t('login.password')}
                                placeholderTextColor={theme.colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPw}
                                accessibilityLabel={t('login.password')}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                                <Ionicons
                                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.forgotLink}
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            <Text style={styles.forgotText}>{t('auth.forgot_password')}</Text>
                        </TouchableOpacity>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            accessibilityLabel={t('login.submit')}
                            accessibilityRole="button"
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.buttonText}>{t('login.submit')}</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Register')}
                            style={styles.link}
                            accessibilityLabel={t('login.register_prompt')}
                            accessibilityRole="button"
                        >
                            <Text style={styles.linkText}>{t('login.register_prompt')}</Text>
                        </TouchableOpacity>
                    </MotiView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
