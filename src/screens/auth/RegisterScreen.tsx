import React, { useState, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../storage/supabase';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';

function mapAuthError(msg: string, t: (k: string) => string): string {
    if (msg.includes('User already registered')) return t('auth.error_already_registered');
    if (msg.includes('Password should be at least')) return t('register.error_password_length');
    if (msg.includes('Unable to validate email')) return t('auth.error_invalid_email');
    if (msg.includes('Too many requests')) return t('auth.error_too_many_requests');
    return msg;
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        backBtn: { padding: theme.spacing.md, marginLeft: theme.spacing.sm },
        inner: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg, paddingTop: 0 },
        logoArea: { alignItems: 'center', marginBottom: theme.spacing.xl },
        logoCircle: {
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: theme.spacing.md,
        },
        appName: { fontSize: 18, fontWeight: '900', color: theme.colors.text, letterSpacing: 3 },
        title: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.xl },
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
            marginBottom: theme.spacing.xs, minHeight: 52,
        },
        pwInput: { flex: 1, color: theme.colors.text, padding: theme.spacing.md, fontSize: 16 },
        eyeBtn: { padding: theme.spacing.md },
        pwHint: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: theme.spacing.md },
        errorText: { color: theme.colors.error, marginBottom: theme.spacing.md, fontSize: 14, fontWeight: '500' },
        button: {
            backgroundColor: theme.colors.secondary,
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

export default function RegisterScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);

    const handleRegister = async () => {
        if (!email.trim() || !password) {
            setError(t('login.error_required'));
            return;
        }
        if (password.length < 8) {
            setError(t('register.error_password_length'));
            return;
        }
        setLoading(true);
        setError('');
        const { error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: 'pickforme://verify-email' },
        });
        if (authError) {
            setError(mapAuthError(authError.message, t));
        } else {
            navigation.replace('EmailVerification', { email: email.trim() });
        }
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>

                    <MotiView
                        from={{ opacity: 0, translateY: 24 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 450 }}
                        style={styles.inner}
                    >
                        <View style={styles.logoArea}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="person-add" size={36} color={theme.colors.secondary} />
                            </View>
                            <Text style={styles.appName}>PICK FOR ME</Text>
                        </View>

                        <Text style={styles.title}>{t('register.title')}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder={t('register.email')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            accessibilityLabel={t('register.email')}
                            returnKeyType="next"
                        />

                        <View style={styles.pwWrapper}>
                            <TextInput
                                style={styles.pwInput}
                                placeholder={t('register.password')}
                                placeholderTextColor={theme.colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPw}
                                accessibilityLabel={t('register.password')}
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                            />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                                <Ionicons
                                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.pwHint}>{t('register.password_hint')}</Text>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                            accessibilityLabel={t('register.submit')}
                            accessibilityRole="button"
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.buttonText}>{t('register.submit')}</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.link}
                            accessibilityLabel={t('register.login_prompt')}
                            accessibilityRole="button"
                        >
                            <Text style={styles.linkText}>{t('register.login_prompt')}</Text>
                        </TouchableOpacity>
                    </MotiView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
