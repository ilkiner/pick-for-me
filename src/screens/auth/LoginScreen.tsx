import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../../storage/supabase';
import { Theme } from '../../core/Theme';

function mapAuthError(msg: string, t: (k: string) => string): string {
    if (msg.includes('Invalid login credentials')) return t('auth.error_invalid_credentials');
    if (msg.includes('Email not confirmed')) return t('auth.error_email_not_confirmed');
    if (msg.includes('Too many requests')) return t('auth.error_too_many_requests');
    return msg;
}

export default function LoginScreen({ navigation }: any) {
    const { t } = useTranslation();
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
                                <Ionicons name="shuffle" size={40} color={Theme.colors.primary} />
                            </View>
                            <Text style={styles.appName}>PICK FOR ME</Text>
                        </View>

                        <Text style={styles.title}>{t('login.title')}</Text>

                        {isDemoMode && (
                            <View style={styles.demoBox}>
                                <Ionicons name="information-circle-outline" size={16} color={Theme.colors.accent} />
                                <Text style={styles.demoText}>{t('auth.demo_mode_hint')}</Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder={t('login.email')}
                            placeholderTextColor={Theme.colors.textSecondary}
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
                                placeholderTextColor={Theme.colors.textSecondary}
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
                                    color={Theme.colors.textSecondary}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    inner: { flex: 1, justifyContent: 'center', padding: Theme.spacing.lg },
    logoArea: { alignItems: 'center', marginBottom: Theme.spacing.xxl },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Theme.spacing.md,
    },
    appName: { fontSize: 18, fontWeight: '900', color: Theme.colors.text, letterSpacing: 3 },
    title: { fontSize: 28, fontWeight: '800', color: Theme.colors.text, marginBottom: Theme.spacing.xl },
    demoBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(251,191,36,0.1)',
        borderRadius: Theme.borderRadius.sm,
        borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
        padding: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
    },
    demoText: { flex: 1, color: Theme.colors.accent, fontSize: 13, lineHeight: 18 },
    input: {
        backgroundColor: Theme.colors.surface,
        color: Theme.colors.text,
        padding: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        marginBottom: Theme.spacing.md,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        fontSize: 16, minHeight: 52,
    },
    pwWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        marginBottom: Theme.spacing.sm,
        minHeight: 52,
    },
    pwInput: {
        flex: 1, color: Theme.colors.text, padding: Theme.spacing.md,
        fontSize: 16,
    },
    eyeBtn: { padding: Theme.spacing.md },
    forgotLink: { alignSelf: 'flex-end', marginBottom: Theme.spacing.md, minHeight: 36, justifyContent: 'center' },
    forgotText: { color: Theme.colors.primary, fontSize: 13, fontWeight: '600' },
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
});
