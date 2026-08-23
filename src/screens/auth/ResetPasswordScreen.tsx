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
import { track } from '../../core/Analytics';

// Supabase'in varsayılan alt sınırı; Dashboard'dan yükseltilirse sunucu yine
// reddeder ve mesajı olduğu gibi gösteririz.
const MIN_PASSWORD_LENGTH = 6;

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        inner: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
        iconArea: { alignItems: 'center', marginBottom: theme.spacing.xl },
        iconCircle: {
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            alignItems: 'center', justifyContent: 'center',
        },
        title: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.sm },
        subtitle: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl, lineHeight: 22 },
        inputWrap: {
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            marginBottom: theme.spacing.md,
            paddingRight: theme.spacing.xs,
        },
        input: {
            flex: 1, color: theme.colors.text,
            padding: theme.spacing.md, fontSize: 16, minHeight: 52,
        },
        eyeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
        hint: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: theme.spacing.md },
        errorText: { color: theme.colors.error, marginBottom: theme.spacing.md, fontSize: 14, fontWeight: '500' },
        button: {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius.md,
            alignItems: 'center', justifyContent: 'center',
            minHeight: 52, marginTop: theme.spacing.sm,
        },
        buttonDisabled: { opacity: 0.6 },
        buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        link: { marginTop: theme.spacing.lg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
        linkText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
        successBox: {
            alignItems: 'center', padding: theme.spacing.xl,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            marginBottom: theme.spacing.lg,
            gap: theme.spacing.sm,
        },
        successText: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
        successSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    });
}

/**
 * Sıfırlama bağlantısından gelen kullanıcı buraya düşer. Bu noktada Supabase
 * oturumu zaten kurulmuştur (authLinks.consumeRecoveryLink), yani tek iş yeni
 * şifreyi almak. `onDone` kurtarma modunu kapatır: başarıda kullanıcı giriş
 * yapmış olarak uygulamaya, vazgeçmede çıkış yapılıp giriş ekranına döner.
 */
export default function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async () => {
        if (loading) return;
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(t('auth.reset_too_short', { count: MIN_PASSWORD_LENGTH }));
            return;
        }
        if (password !== confirm) {
            setError(t('auth.reset_mismatch'));
            return;
        }

        setLoading(true);
        setError('');
        const { error: authError } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (authError) {
            // Oturum düşmüşse (link çok eski) Supabase burada hata verir —
            // mesajı olduğu gibi göstermek en doğru bilgiyi verir.
            setError(authError.message);
            track('password_reset_failed');
            return;
        }

        track('password_reset_completed');
        setDone(true);
    };

    // Vazgeçen kullanıcı kurtarma oturumuyla uygulamada kalmasın: çıkış yap.
    const handleCancel = async () => {
        try {
            await supabase.auth.signOut();
        } catch {
            // çıkış başarısız olsa bile kurtarma modundan çıkmalıyız
        }
        onDone();
    };

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
                        <View style={styles.iconArea}>
                            <View style={styles.iconCircle}>
                                <Ionicons
                                    name={done ? 'checkmark-circle-outline' : 'key-outline'}
                                    size={36}
                                    color={done ? theme.colors.success : theme.colors.primary}
                                />
                            </View>
                        </View>

                        {done ? (
                            <>
                                <MotiView
                                    from={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={styles.successBox}
                                >
                                    <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
                                    <Text style={styles.successText}>{t('auth.reset_success')}</Text>
                                    <Text style={styles.successSub}>{t('auth.reset_success_sub')}</Text>
                                </MotiView>
                                <TouchableOpacity style={styles.button} onPress={onDone} accessibilityRole="button">
                                    <Text style={styles.buttonText}>{t('auth.reset_continue')}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.title}>{t('auth.reset_title')}</Text>
                                <Text style={styles.subtitle}>{t('auth.reset_subtitle')}</Text>

                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('auth.reset_new')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!show}
                                        autoCapitalize="none"
                                        autoComplete="new-password"
                                        textContentType="newPassword"
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeBtn}
                                        onPress={() => setShow(v => !v)}
                                        accessibilityRole="button"
                                        accessibilityLabel={t(show ? 'auth.hide_password' : 'auth.show_password')}
                                    >
                                        <Ionicons
                                            name={show ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('auth.reset_confirm')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={confirm}
                                        onChangeText={setConfirm}
                                        secureTextEntry={!show}
                                        autoCapitalize="none"
                                        autoComplete="new-password"
                                        textContentType="newPassword"
                                        onSubmitEditing={handleSubmit}
                                    />
                                </View>

                                <Text style={styles.hint}>
                                    {t('auth.reset_hint', { count: MIN_PASSWORD_LENGTH })}
                                </Text>

                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <TouchableOpacity
                                    style={[styles.button, loading && styles.buttonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    accessibilityRole="button"
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.buttonText}>{t('auth.reset_submit')}</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.link} onPress={handleCancel} accessibilityRole="button">
                                    <Text style={styles.linkText}>{t('auth.reset_cancel')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </MotiView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
