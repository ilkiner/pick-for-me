import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../storage/supabase';
import { Theme } from '../../core/Theme';

export default function LoginScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError(t('login.error_required'));
            return;
        }
        setLoading(true);
        setError('');
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) setError(authError.message);
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
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

                <TextInput
                    style={styles.input}
                    placeholder={t('login.email')}
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    accessibilityLabel={t('login.email')}
                />
                <TextInput
                    style={styles.input}
                    placeholder={t('login.password')}
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    accessibilityLabel={t('login.password')}
                />

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    inner: { flex: 1, justifyContent: 'center', padding: Theme.spacing.lg },
    logoArea: { alignItems: 'center', marginBottom: Theme.spacing.xxl },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Theme.spacing.md,
    },
    appName: {
        fontSize: 18,
        fontWeight: '900',
        color: Theme.colors.text,
        letterSpacing: 3,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Theme.colors.text,
        marginBottom: Theme.spacing.xl,
    },
    input: {
        backgroundColor: Theme.colors.surface,
        color: Theme.colors.text,
        padding: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        marginBottom: Theme.spacing.md,
        borderWidth: 1,
        borderColor: Theme.colors.surfaceBorder,
        fontSize: 16,
        minHeight: 52,
    },
    errorText: {
        color: Theme.colors.error,
        marginBottom: Theme.spacing.md,
        fontSize: 14,
        fontWeight: '500',
    },
    button: {
        backgroundColor: Theme.colors.primary,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        marginTop: Theme.spacing.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    link: {
        marginTop: Theme.spacing.xl,
        alignItems: 'center',
        minHeight: 44,
        justifyContent: 'center',
    },
    linkText: { color: Theme.colors.primary, fontSize: 15, fontWeight: '600' },
});
