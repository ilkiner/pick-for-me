import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, ScrollView, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickEngine } from '../../core/PickEngine';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { ModernButton } from '../../components/ModernButton';
import { GlassCard } from '../../components/GlassCard';

type ColorMode = 'random' | 'organic' | 'vivid' | 'digital' | 'soft';

interface GeneratedColor {
    hex: string;
    palette: { primary: string; lighter: string; darker: string; accent: string };
    metadata: { nameKey: string; descKey: string; sugKey: string };
}

export default function ColorPickerScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [mode, setMode] = useState<ColorMode>('random');
    const [colorData, setColorData] = useState<GeneratedColor | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [memory, setMemory] = useState<string[]>([]);

    const shuffleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const modes: ColorMode[] = ['random', 'organic', 'vivid', 'digital', 'soft'];

    const handlePick = useCallback(async () => {
        if (isShuffling) return;
        
        setIsShuffling(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Start shuffle animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(shuffleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.timing(shuffleAnim, { toValue: 0, duration: 100, useNativeDriver: true })
            ]),
            { iterations: 5 }
        ).start();

        // Simulate "thinking" / shuffling
        setTimeout(() => {
            let result: GeneratedColor;
            let attempts = 0;
            
            // Non-repeat logic: avoid same color or very similar back-to-back
            do {
                result = PickEngine.generateAdvancedColor(mode);
                attempts++;
            } while (memory.includes(result.hex) && attempts < 10);

            setColorData(result);
            setMemory(prev => [result.hex, ...prev].slice(0, 10));
            saveToHistory(result);
            setIsShuffling(false);
            
            // Pulse fade in
            fadeAnim.setValue(0.5);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true
            }).start();
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 1000);
    }, [mode, isShuffling, memory, fadeAnim, shuffleAnim]);

    const saveToHistory = async (val: GeneratedColor) => {
        try {
            const stored = await AsyncStorage.getItem('@app_history');
            const parsed = stored ? JSON.parse(stored) : [];
            const newItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                type: 'color',
                result: val,
                timestamp: Date.now()
            };
            parsed.push(newItem);
            await AsyncStorage.setItem('@app_history', JSON.stringify(parsed));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };

    const handleSave = async () => {
        if (!colorData) return;
        try {
            const stored = await AsyncStorage.getItem('@saved_colors');
            const parsed = stored ? JSON.parse(stored) : [];
            if (!parsed.includes(colorData.hex)) {
                parsed.push(colorData.hex);
                await AsyncStorage.setItem('@saved_colors', JSON.stringify(parsed));
                Alert.alert(t('tools.color.saved'));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCopy = () => {
        if (!colorData) return;
        // Since we don't have expo-clipboard, we'll use Share as a premium alternative 
        // to "Copy/Share" or just show an alert with the value for manual copy
        Share.share({
            message: `Color: ${colorData.hex}\nMode: ${mode}\nInspiration: ${t(`tools.color.names.${colorData.metadata.nameKey}`)}`,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('tools.color.title')}</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.modeWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScroll}>
                    {modes.map(m => (
                        <TouchableOpacity 
                            key={m} 
                            style={[styles.modeChip, mode === m && styles.modeChipActive]} 
                            onPress={() => setMode(m)}
                        >
                            <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
                                {t(`tools.color.modes.${m}`)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.content}>
                {!colorData ? (
                    <View style={styles.placeholderContainer}>
                        <Animated.View style={{ transform: [{ scale: Animated.add(1, Animated.multiply(shuffleAnim, 0.1)) }] }}>
                            <View style={[styles.paletteOuter, { backgroundColor: isShuffling ? '#555' : theme.colors.surface }]}>
                                <Ionicons name="color-palette" size={120} color={isShuffling ? '#AAA' : theme.colors.primary} />
                            </View>
                        </Animated.View>
                        <Text style={styles.hintText}>{t('tools.color.hint')}</Text>
                    </View>
                ) : (
                    <Animated.View style={[styles.resultContainer, { opacity: fadeAnim }]}>
                        <GlassCard style={styles.mainCard}>
                            <View style={[styles.colorLarge, { backgroundColor: colorData.hex }]} />
                            <View style={styles.infoBox}>
                                <Text style={styles.colorName}>
                                    {t(`tools.color.names.${colorData.metadata.nameKey}`)}
                                </Text>
                                <Text style={styles.descText}>
                                    {t(`tools.color.descriptions.${colorData.metadata.descKey}`)}
                                </Text>
                                <View style={styles.caseContainer}>
                                    <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                                    <Text style={styles.caseText}>
                                        {t(`tools.color.suggestions.${colorData.metadata.sugKey}`)}
                                    </Text>
                                </View>
                            </View>
                        </GlassCard>

                        <View style={styles.paletteLabelRow}>
                            <Text style={styles.paletteLabel}>{t('tools.color.palette')}</Text>
                            <Text style={styles.hexCode}>{colorData.hex}</Text>
                        </View>

                        <View style={styles.paletteRow}>
                            {['lighter', 'darker', 'accent'].map((key) => (
                                <View key={key} style={styles.paletteWrapperSmall}>
                                    <View style={[styles.paletteSmall, { backgroundColor: (colorData.palette as any)[key] }]} />
                                    <Text style={styles.smallHex}>{(colorData.palette as any)[key]}</Text>
                                </View>
                            ))}
                        </View>
                        
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
                                <Ionicons name="share-outline" size={24} color={theme.colors.text} />
                                <Text style={styles.actionBtnText}>{t('tools.color.copy_hex')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
                                <Ionicons name="bookmark-outline" size={24} color={theme.colors.text} />
                                <Text style={styles.actionBtnText}>{t('tools.color.save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}
            </View>

            <View style={styles.footer}>
                <ModernButton
                    title={isShuffling ? '...' : t('tools.color.pick')}
                    onPress={handlePick}
                    variant="primary"
                    style={styles.pickBtn}
                />
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, letterSpacing: 1 },
    modeWrapper: { backgroundColor: 'rgba(255,255,255,0.02)', paddingVertical: 12 },
    modeScroll: { paddingHorizontal: theme.spacing.md, gap: 10 },
    modeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    modeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    modeChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
    modeChipTextActive: { color: '#FFF' },
    content: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
    placeholderContainer: { alignItems: 'center' },
    paletteOuter: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.surfaceBorder, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    hintText: { marginTop: theme.spacing.xl, fontSize: 18, color: theme.colors.textSecondary, fontWeight: '600', textAlign: 'center' },
    resultContainer: { width: '100%' },
    mainCard: { borderRadius: 30, overflow: 'hidden', padding: 0 },
    colorLarge: { height: 180, width: '100%' },
    infoBox: { padding: 20 },
    colorName: { fontSize: 28, fontWeight: '900', color: theme.colors.text, marginBottom: 4 },
    descText: { fontSize: 16, color: theme.colors.textSecondary, textTransform: 'capitalize', marginBottom: 15 },
    caseContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 },
    caseText: { fontSize: 13, color: theme.colors.text, fontWeight: '500', flex: 1 },
    paletteLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 15 },
    paletteLabel: { fontSize: 14, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase' },
    hexCode: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
    paletteRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    paletteWrapperSmall: { flex: 1, alignItems: 'center', gap: 8 },
    paletteSmall: { height: 60, width: '100%', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    smallHex: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: 'bold' },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 30 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surface, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    actionBtnText: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
    footer: { padding: theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.xl },
    pickBtn: { width: '100%' }
    });
}

