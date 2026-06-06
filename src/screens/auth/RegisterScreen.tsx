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

function mapAuthError(msg: string, t: (k: string) => string): string {
    if (msg.includes('User already registered')) return t('auth.error_already_registered');
    if (msg.includes('Password should be at least')) return t('register.error_password_length');
    if (msg.includes('Unable to validate email')) return t('auth.error_invalid_email');
    if (msg.includes('Too many requests')) return t('auth.error_too_many_requests');
    return msg;
}

export default function RegisterScreen({ navigation }: any) {
    const { t } = useTranslation();
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
                        <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
                    </TouchableOpacity>

                    <MotiView
                        from={{ opacity: 0, translateY: 24 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 450 }}
                        style={styles.inner}
                    >
                        <View style={styles.logoArea}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="person-add" size={36} color={Theme.colors.secondary} />
                            </View>
                            <Text style={styles.appName}>PICK FOR ME</Text>
                        </View>

                        <Text style={styles.title}>{t('register.title')}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder={t('register.email')}
                            placeholderTextColor={Theme.colors.textSecondary}
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
                                placeholderTextColor={Theme.colors.textSecondary}
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
                                    color={Theme.colors.textSecondary}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    backBtn: { padding: Theme.spacing.md, marginLeft: Theme.spacing.sm },
    inner: { flex: 1, justifyContent: 'center', padding: Theme.spacing.lg, paddingTop: 0 },
    logoArea: { alignItems: 'center', marginBottom: Theme.spacing.xl },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Theme.spacing.md,
    },
    appName: { fontSize: 18, fontWeight: '900', color: Theme.colors.text, letterSpacing: 3 },
    title: { fontSize: 28, fontWeight: '800', color: Theme.colors.text, marginBottom: Theme.spacing.xl },
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
        marginBottom: Theme.spacing.xs,
        minHeight: 52,
    },
    pwInput: { flex: 1, color: Theme.colors.text, padding: Theme.spacing.md, fontSize: 16 },
    eyeBtn: { padding: Theme.spacing.md },
    pwHint: { color: Theme.colors.textSecondary, fontSize: 12, marginBottom: Theme.spacing.md },
    errorText: { color: Theme.colors.error, marginBottom: Theme.spacing.md, fontSize: 14, fontWeight: '500' },
    button: {
        backgroundColor: Theme.colors.secondary,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center', justifyContent: 'center',
        minHeight: 52, marginTop: Theme.spacing.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    link: { marginTop: Theme.spacing.xl, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    linkText: { color: Theme.colors.primary, fontSize: 15, fontWeight: '600' },
});
