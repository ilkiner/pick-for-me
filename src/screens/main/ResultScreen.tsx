import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { pushHistoryItemToCloud } from '../../storage/syncService';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { Theme } from '../../core/Theme';
import { ModernButton } from '../../components/ModernButton';
import { GlassCard } from '../../components/GlassCard';
import { usePro } from '../../store/ProContext';
import { AdManager } from '../../core/AdManager';

interface HistoryItem {
    id: string;
    type: string;
    result: any;
    timestamp: number;
}

export default function ResultScreen({ route, navigation }: any) {
    const { t, i18n } = useTranslation();
    const { isPro } = usePro();
    const { result, sourceRoute, type } = route.params || {};

    // If we have a direct result from a tool, we're in "Single Result" mode.
    // Otherwise, we're in "History" mode.
    const isSingleResult = result !== undefined && result !== null;

    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const viewShotRef = useRef<any>(null);

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showQR, setShowQR] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const loadHistory = async () => {
        try {
            const stored = await AsyncStorage.getItem('@app_history');
            if (stored) {
                const parsed: HistoryItem[] = JSON.parse(stored);
                // Filter for last 48 hours
                const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
                const recent = parsed.filter(item => item.timestamp > fortyEightHoursAgo);
                
                // Sort descending (newest first)
                recent.sort((a, b) => b.timestamp - a.timestamp);
                
                setHistory(recent);
                
                // Cleanup old items from storage if needed
                if (recent.length !== parsed.length) {
                     await AsyncStorage.setItem('@app_history', JSON.stringify(recent));
                }
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (!isSingleResult) {
                loadHistory();
            }
        }, [isSingleResult])
    );

    useEffect(() => {
        if (isSingleResult) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Auto-save to history
            saveToHistory(type, result);

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
             Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isSingleResult, result]);

    const clearHistory = () => {
        Alert.alert(
            t('tools.results.clear_confirm_title', 'Clear History'),
            t('tools.results.clear_confirm_msg', 'All activity history will be deleted.'),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('tools.results.clear', 'Clear'),
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('@app_history');
                        setHistory([]);
                    },
                },
            ]
        );
    };

    const saveToHistory = async (saveType: string, val: any) => {
        try {
            const stored = await AsyncStorage.getItem('@app_history');
            const parsed = stored ? JSON.parse(stored) : [];
            const newItem: HistoryItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                type: saveType || 'unknown',
                result: val,
                timestamp: Date.now()
            };
            parsed.push(newItem);
            await AsyncStorage.setItem('@app_history', JSON.stringify(parsed));
            pushHistoryItemToCloud(newItem).catch(() => {});
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };

    const handleShare = async () => {
        if (isSharing || !viewShotRef.current) return;
        setIsSharing(true);
        try {
            const uri = await captureRef(viewShotRef, { format: 'png', quality: 0.95 });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, { mimeType: 'image/png' });
            }
        } catch {
            // share cancelled or failed silently
        } finally {
            setIsSharing(false);
        }
    };

    const getResultText = (res: any, tpe: string) => {
        if (!res && res !== 0) return '—';
        if (tpe === 'coin') {
             if (res === 'edge') return t('tools.coin.edge');
             return t(`tools.results.${res}`);
        }
        if (tpe === 'color') {
            if (res.metadata?.nameKey) {
                return t(`tools.color.names.${res.metadata.nameKey}`) + ` (${res.hex})`;
            }
            return res.name || res.hex || res;
        }
        if (tpe === 'dice') return (Array.isArray(res) ? res : [res]).join(' & ');
        if (typeof res === 'string') return res;
        if (res && typeof res === 'object' && res.label) return res.label;
        return String(res);
    };

    const renderCoinResult = (val: string) => {
        const isTurkish = i18n.language === 'tr';
        if (val === 'edge') {
            return (
                <View style={styles.edgeContainer}>
                    <View style={styles.coinEdgeView} />
                    <Text style={styles.edgeJoke}>{t('tools.coin.edge_msg')}</Text>
                </View>
            );
        }

        const isHeads = val === 'heads';
        return (
            <View style={[styles.coinResultCard, isHeads ? styles.headsBg : styles.tailsBg]}>
                <View style={[styles.coinDetail, { borderColor: isHeads ? '#DAA520' : '#C0C0C0' }]}>
                    <Text style={[styles.coinLabel, { color: isHeads ? '#DAA520' : '#C0C0C0' }]}>
                        {isHeads ? t('tools.coin.heads_label') : t('tools.coin.tails_label')}
                    </Text>
                    <Ionicons 
                        name={isHeads ? "person-circle-outline" : "leaf-outline"} 
                        size={100} 
                        color={isHeads ? "#FFD700" : "#C0C0C0"} 
                    />
                </View>
            </View>
        );
    };

    const renderHistoryItem = (item: HistoryItem) => {
        const date = new Date(item.timestamp);
        const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        let displayTitle = item.type.toUpperCase();
        if (item.type === 'idea') displayTitle = 'IDEA';
        if (item.type === 'challenge') displayTitle = 'CHALLENGE';

        return (
            <GlassCard key={item.id} style={styles.historyCard}>
                <View style={styles.hHeader}>
                    <Text style={styles.hType}>{displayTitle}</Text>
                    <Text style={styles.hTime}>{timeString} - {date.getDate()}/{date.getMonth() + 1}</Text>
                </View>
                {item.type === 'coin' ? (
                     <View style={styles.hCoinRow}>
                        <View style={[styles.hCoinIcon, item.result === 'heads' ? {backgroundColor: '#FFD700'} : (item.result === 'edge' ? {backgroundColor: '#555'} : {backgroundColor: '#E8E8E8'})]} />
                        <Text style={styles.hResultText}>{getResultText(item.result, item.type)}</Text>
                     </View>
                ) : (
                    <Text style={styles.hResultText}>{getResultText(item.result, item.type)}</Text>
                )}
            </GlassCard>
        );
    };

    if (!isSingleResult) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.historyHeader}>
                    <Text style={styles.headerTitle}>{t('tools.results.title')}</Text>
                    {history.length > 0 && (
                        <TouchableOpacity
                            onPress={clearHistory}
                            style={styles.clearBtn}
                            accessibilityLabel={t('tools.results.clear', 'Clear History')}
                            accessibilityRole="button"
                        >
                            <Ionicons name="trash-outline" size={18} color={Theme.colors.error} />
                            <Text style={styles.clearBtnText}>{t('tools.results.clear', 'Clear')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <Animated.ScrollView contentContainerStyle={{ padding: Theme.spacing.lg }} style={{ opacity: fadeAnim }}>
                    {history.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="time-outline" size={64} color={Theme.colors.surfaceBorder} />
                            <Text style={styles.emptyText}>{t('tools.results.empty')}</Text>
                        </View>
                    ) : (
                        history.map(renderHistoryItem)
                    )}
                </Animated.ScrollView>
            </SafeAreaView>
        );
    }

    const qrValue = type === 'coin' ? getResultText(result, type)
        : type === 'color' ? (result?.hex || String(result))
        : getResultText(result, type);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('tools.common.result')}</Text>
            </View>

            <View style={styles.content}>
                <ViewShot ref={viewShotRef} style={styles.viewShot}>
                    <Animated.View style={[
                        styles.resultContainer,
                        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
                    ]}>
                        {type === 'coin' ? (
                            renderCoinResult(result)
                        ) : (
                            <GlassCard style={[
                                styles.resultBox,
                                type === 'color' ? { backgroundColor: result.hex || result, borderColor: 'rgba(255,255,255,0.3)' } : undefined
                            ] as any}>
                                <Text style={[
                                    styles.resultText,
                                    type === 'color' ? { color: '#fff', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 10 } : undefined
                                ] as any} adjustsFontSizeToFit numberOfLines={3}>
                                    {getResultText(result, type)}
                                </Text>
                            </GlassCard>
                        )}
                    </Animated.View>

                    {type === 'color' && (
                        <Text style={styles.colorHex}>{result.hex || result}</Text>
                    )}

                    {showQR && (
                        <View style={styles.qrContainer}>
                            <QRCode value={qrValue || 'pick-for-me'} size={120} backgroundColor="transparent" color={Theme.colors.text} />
                        </View>
                    )}

                    {/* Watermark for free users — removed for Pro */}
                    {!isPro && (
                        <Text style={styles.watermark}>Pick For Me</Text>
                    )}
                </ViewShot>

                <View style={styles.shareRow}>
                    <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={handleShare}
                        disabled={isSharing}
                        accessibilityRole="button"
                        accessibilityLabel={t('result.share', 'Paylaş')}
                    >
                        <Ionicons name="share-outline" size={20} color="#FFF" />
                        <Text style={styles.shareBtnText}>{isSharing ? '…' : t('result.share', 'Paylaş')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.qrBtn, showQR && styles.qrBtnActive]}
                        onPress={() => setShowQR(v => !v)}
                        accessibilityRole="button"
                        accessibilityLabel="QR"
                    >
                        <Ionicons name="qr-code-outline" size={20} color={showQR ? '#FFF' : Theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.footer}>
                <ModernButton
                    title={t('tools.common.try_again')}
                    onPress={() => navigation.goBack()}
                    variant="primary"
                    style={styles.actionBtn}
                />
                <ModernButton
                    title={t('tools.common.home')}
                    onPress={() => navigation.navigate('Home')}
                    variant="outline"
                    style={styles.actionBtn}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    header: { padding: Theme.spacing.lg, alignItems: 'center' },
    headerTitle: { fontSize: 13, fontWeight: '800', color: Theme.colors.textSecondary, letterSpacing: 4 },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.lg,
        paddingVertical: Theme.spacing.md,
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: 'rgba(239,68,68,0.1)',
        minHeight: 44,
    },
    clearBtnText: { color: Theme.colors.error, fontSize: 13, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', marginTop: Theme.spacing.xxl, gap: Theme.spacing.md },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.lg },
    resultContainer: { width: '100%', alignItems: 'center' },
    resultBox: { width: 300, height: 300, borderRadius: 40, alignItems: 'center', justifyContent: 'center', padding: Theme.spacing.xl },
    resultText: { fontSize: 56, fontWeight: '900', color: Theme.colors.text, textAlign: 'center' },
    colorHex: { marginTop: Theme.spacing.xl, fontSize: 24, fontWeight: '700', color: Theme.colors.textSecondary, letterSpacing: 2 },
    footer: { padding: Theme.spacing.lg, paddingBottom: Platform.OS === 'ios' ? Theme.spacing.xl : Theme.spacing.xxl, gap: Theme.spacing.md },
    actionBtn: { width: '100%' },
    viewShot: { alignItems: 'center', backgroundColor: Theme.colors.background },
    shareRow: { flexDirection: 'row', gap: Theme.spacing.md, marginTop: Theme.spacing.lg, justifyContent: 'center' },
    shareBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Theme.colors.primary, borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.xl, paddingVertical: Theme.spacing.md,
        minHeight: 44,
    },
    shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    qrBtn: {
        width: 44, height: 44, borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
    },
    qrBtnActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
    qrContainer: { marginTop: Theme.spacing.lg, padding: Theme.spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Theme.borderRadius.md },
    emptyText: { color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 50, fontSize: 16 },
    historyCard: { padding: 20, marginBottom: 15, borderRadius: 15 },
    hHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    hType: { color: Theme.colors.primary, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
    hTime: { color: Theme.colors.textSecondary, fontSize: 12 },
    hResultText: { color: Theme.colors.text, fontSize: 18, fontWeight: 'bold' },
    // Coin Specific Styles
    coinResultCard: { width: 280, height: 280, borderRadius: 140, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
    headsBg: { backgroundColor: '#FFD700', borderWidth: 8, borderColor: '#DAA520' },
    tailsBg: { backgroundColor: '#E8E8E8', borderWidth: 8, borderColor: '#C0C0C0' },
    coinDetail: { width: 220, height: 220, borderRadius: 110, borderWidth: 3, borderStyle: 'solid', alignItems: 'center', justifyContent: 'center' },
    coinLabel: { fontSize: 32, fontWeight: '900', marginBottom: 10 },
    edgeContainer: { alignItems: 'center', justifyContent: 'center' },
    coinEdgeView: { width: 40, height: 250, backgroundColor: '#888', borderRadius: 20, borderWidth: 4, borderColor: '#555', shadowColor: '#000', shadowOffset: { width: 10, height: 10 }, shadowOpacity: 0.5, shadowRadius: 10 },
    edgeJoke: { marginTop: 30, fontSize: 20, fontWeight: 'bold', color: Theme.colors.primary, textAlign: 'center', paddingHorizontal: 20 },
    hCoinRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    hCoinIcon: { width: 12, height: 12, borderRadius: 6 },
    watermark: {
        marginTop: 8, color: 'rgba(255,255,255,0.25)',
        fontSize: 11, fontWeight: '700', letterSpacing: 1,
    },
});

