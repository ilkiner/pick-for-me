import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Theme } from '../core/Theme';
import { usePro } from '../store/ProContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    featureKey: string; // i18n key suffix e.g. 'unlimited_lists'
}

export function ProGateModal({ visible, onClose, featureKey }: Props) {
    const { t } = useTranslation();
    const { openPaywall } = usePro();

    const handleUpgrade = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        openPaywall();
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
                <MotiView
                    from={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    style={styles.card}
                >
                    <TouchableOpacity style={styles.closeRow} onPress={onClose}>
                        <Ionicons name="close" size={20} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.iconWrap}>
                        <Ionicons name="lock-closed" size={36} color="#FFD700" />
                    </View>

                    <Text style={styles.title}>{t('pro.gate_title')}</Text>
                    <Text style={styles.body}>{t(`paywall.feature_${featureKey}`)}</Text>
                    <Text style={styles.body2}>{t('pro.gate_cta')}</Text>

                    <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
                        <Ionicons name="diamond" size={16} color="#fff" />
                        <Text style={styles.upgradeText}>{t('pro.upgrade')}</Text>
                    </TouchableOpacity>
                </MotiView>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.lg,
    },
    card: {
        backgroundColor: '#1A1A2E', borderRadius: Theme.borderRadius.xl,
        padding: Theme.spacing.lg, width: '100%', maxWidth: 340,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
        alignItems: 'center',
    },
    closeRow: { position: 'absolute', top: 14, right: 14 },
    iconWrap: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Theme.spacing.md,
    },
    title: {
        fontSize: 20, fontWeight: '900', color: Theme.colors.text,
        textAlign: 'center', marginBottom: 8,
    },
    body: {
        fontSize: 14, color: Theme.colors.textSecondary,
        textAlign: 'center', marginBottom: 4,
    },
    body2: {
        fontSize: 13, color: Theme.colors.textSecondary,
        textAlign: 'center', marginBottom: Theme.spacing.lg,
    },
    upgradeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Theme.colors.primary,
        borderRadius: Theme.borderRadius.lg, paddingVertical: 14,
        paddingHorizontal: Theme.spacing.xl, width: '100%', justifyContent: 'center',
    },
    upgradeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
