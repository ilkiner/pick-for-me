import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { AppTheme } from '../core/Theme';
import { track } from '../core/Analytics';
import { isGoogleSignInAvailable, signInWithGoogle } from '../core/googleAuth';

/**
 * "Google ile devam et" — Login ve Register ekranlarının ikisinde de aynı düğme.
 *
 * Başarıda hiçbir şey yapmıyor ve bilerek: Supabase oturumu kurunca
 * `onAuthStateChange` yayınlanıyor, navigator kendiliğinden ana uygulamaya
 * geçiyor. Buradan `navigation.replace` çağırmak e-posta/şifre akışından farklı
 * ikinci bir yol açardı.
 *
 * Yapılandırma eksikse (yerel modül yok, web client ID girilmemiş, Supabase
 * demo modu) düğme hiç çizilmiyor — çalışmayacak bir düğme göstermek, dokunup
 * hata alan kullanıcıdan daha kötü.
 */
export function GoogleSignInButton({ onError }: { onError: (message: string) => void }) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [loading, setLoading] = useState(false);

    if (!isGoogleSignInAvailable()) return null;

    const handlePress = async () => {
        if (loading) return;
        setLoading(true);
        onError('');
        track('google_signin_started');

        const outcome = await signInWithGoogle();

        // Başarıda setLoading(false) YOK: oturum kurulunca bu ekran zaten
        // sökülüyor, state'i güncellemek sökülmüş bileşene yazmak olurdu.
        if (outcome.status === 'ok') {
            track('google_signin_completed');
            return;
        }

        setLoading(false);

        if (outcome.status === 'cancelled') {
            // Vazgeçmek hata değil — kullanıcı kırmızı bir satır görmemeli.
            track('google_signin_cancelled');
            return;
        }
        if (outcome.status === 'unavailable') {
            track('google_signin_unavailable', { reason: outcome.reason });
            onError(
                outcome.reason === 'play_services'
                    ? t('auth.google_play_services_missing')
                    : t('auth.google_unavailable'),
            );
            return;
        }
        track('google_signin_failed');
        onError(outcome.message || t('auth.google_error'));
    };

    return (
        <>
            <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.or')}</Text>
                <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePress}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('auth.continue_with_google')}
            >
                {loading ? (
                    <ActivityIndicator color={theme.colors.text} />
                ) : (
                    <>
                        <Ionicons name="logo-google" size={19} color="#EA4335" />
                        <Text style={styles.buttonText} numberOfLines={1}>
                            {t('auth.continue_with_google')}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        dividerRow: {
            flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
            marginTop: theme.spacing.lg, marginBottom: theme.spacing.md,
        },
        dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.surfaceBorder },
        dividerText: {
            color: theme.colors.textSecondary, fontSize: 12,
            fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
        },
        // Birincil düğmeyle aynı geometri (minHeight 52, aynı köşe yarıçapı) ama
        // yüzey renginde: Google girişi bir alternatif, ekranın ana eylemi değil.
        button: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            minHeight: 52, paddingHorizontal: theme.spacing.md,
        },
        buttonDisabled: { opacity: 0.6 },
        buttonText: { color: theme.colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
    });
}
