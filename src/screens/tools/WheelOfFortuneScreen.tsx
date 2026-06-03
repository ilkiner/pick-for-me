import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { PickEngine } from '../../core/PickEngine';
import { LocalStorage } from '../../storage/local';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { ModernButton } from '../../components/ModernButton';

const COLORS = [
    Theme.colors.primary,
    Theme.colors.secondary,
    Theme.colors.accent,
    Theme.colors.error,
    Theme.colors.success,
    '#F59E0B',
    '#EC4899',
    '#14B8A6',
];

export default function WheelOfFortuneScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
    const [newOption, setNewOption] = useState('');
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<{ id: string; label: string } | null>(null);

    const spinRad = useSharedValue(0);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${spinRad.value}rad` }],
    }));

    useEffect(() => {
        LocalStorage.getItem<{ id: string; label: string }[]>('wheelOptions').then((data) => {
            if (data) setOptions(data);
        });
    }, []);

    const saveOptions = (newOpts: { id: string; label: string }[]) => {
        setOptions(newOpts);
        LocalStorage.setItem('wheelOptions', newOpts);
    };

    const addOption = () => {
        if (!newOption.trim()) return;
        saveOptions([...options, { id: Date.now().toString(), label: newOption.trim() }]);
        setNewOption('');
    };

    const removeOption = (id: string) => {
        saveOptions(options.filter(o => o.id !== id));
    };

    const onSpinDone = (result: { id: string; label: string }) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSpinning(false);
        setWinner(result);
        // Auto-navigate after brief winner display
        setTimeout(() => {
            setWinner(null);
            navigation.navigate('Result', { result, type: 'wheel', sourceRoute: 'WheelOfFortune' });
        }, 1400);
    };

    const handleSpin = () => {
        if (options.length < 2 || isSpinning) return;

        setIsSpinning(true);
        setWinner(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const selectedIndex = Math.floor(Math.random() * options.length);
        const result = options[selectedIndex];
        const N = options.length;
        const extraFraction = 1 - (selectedIndex + 0.5) / N;
        const totalTurns = 5 + extraFraction;
        const endRad = spinRad.value + totalTurns * 2 * Math.PI;

        spinRad.value = withTiming(endRad, {
            duration: 4200,
            easing: Easing.out(Easing.poly(4)),
        }, (finished) => {
            if (finished) {
                runOnJS(onSpinDone)(result);
            }
        });
    };

    const renderWheel = () => {
        const radius = 140;
        const cx = 150;
        const cy = 150;
        const step = (2 * Math.PI) / options.length;

        return (
            <View style={styles.wheelContainer}>
                <Animated.View style={animStyle}>
                    <Svg width={300} height={300} viewBox="0 0 300 300">
                        <G>
                            {options.map((option, i) => {
                                const startAngle = i * step - Math.PI / 2;
                                const endAngle = startAngle + step;
                                const x1 = cx + radius * Math.cos(startAngle);
                                const y1 = cy + radius * Math.sin(startAngle);
                                const x2 = cx + radius * Math.cos(endAngle);
                                const y2 = cy + radius * Math.sin(endAngle);
                                const largeArc = step > Math.PI ? 1 : 0;
                                const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                                const midAngle = startAngle + step / 2;
                                const textR = radius * 0.62;
                                const tx = cx + textR * Math.cos(midAngle);
                                const ty = cy + textR * Math.sin(midAngle);
                                const textDeg = (midAngle * 180) / Math.PI + 90;

                                return (
                                    <G key={option.id}>
                                        <Path d={path} fill={COLORS[i % COLORS.length]} stroke={Theme.colors.background} strokeWidth="2" />
                                        <SvgText
                                            x={tx} y={ty}
                                            fill="#fff"
                                            fontSize="11"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                            transform={`rotate(${textDeg}, ${tx}, ${ty})`}
                                        >
                                            {option.label.length > 9 ? option.label.substring(0, 7) + '…' : option.label}
                                        </SvgText>
                                    </G>
                                );
                            })}
                        </G>
                    </Svg>
                </Animated.View>

                {/* Pointer */}
                <View style={styles.pointer} />

                {/* Center dot */}
                <View style={styles.centerDot} />

                {/* Winner spotlight */}
                {winner && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                        style={styles.winnerOverlay}
                    >
                        <Text style={styles.winnerEmoji}>🎉</Text>
                        <Text style={styles.winnerLabel} numberOfLines={2}>{winner.label}</Text>
                    </MotiView>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                    >
                        <Ionicons name="chevron-back" size={26} color={Theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('tools.wheel.title')}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.wheelArea}>
                    {options.length > 1 ? renderWheel() : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="aperture-outline" size={80} color={Theme.colors.surfaceBorder} />
                            <Text style={styles.emptyTitle}>{t('tools.wheel.empty')}</Text>
                            <Text style={styles.emptyHint}>
                                {options.length === 1
                                    ? t('tools.wheel.need_more')
                                    : t('tools.wheel.placeholder')}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.controls}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder={t('tools.wheel.placeholder')}
                            placeholderTextColor={Theme.colors.textSecondary}
                            value={newOption}
                            onChangeText={setNewOption}
                            onSubmitEditing={addOption}
                            accessibilityLabel={t('tools.wheel.placeholder')}
                        />
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={addOption}
                            accessibilityLabel={t('tools.wheel.add_option')}
                            accessibilityRole="button"
                        >
                            <Ionicons name="add" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={options}
                        keyExtractor={item => item.id}
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <GlassCard style={styles.listItem}>
                                <Text style={styles.listText} numberOfLines={1}>{item.label}</Text>
                                <TouchableOpacity
                                    onPress={() => removeOption(item.id)}
                                    accessibilityLabel={t('tools.wheel.delete')}
                                    accessibilityRole="button"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
                                </TouchableOpacity>
                            </GlassCard>
                        )}
                    />

                    <ModernButton
                        title={isSpinning ? t('tools.wheel.spinning') : t('tools.wheel.spin')}
                        onPress={handleSpin}
                        disabled={options.length < 2 || isSpinning}
                        variant="primary"
                        style={styles.spinBtn}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Theme.colors.surface,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
    },
    title: { fontSize: 22, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
    wheelArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wheelContainer: { alignItems: 'center', justifyContent: 'center' },
    pointer: {
        position: 'absolute',
        top: -10,
        width: 0, height: 0,
        borderLeftWidth: 14, borderLeftColor: 'transparent',
        borderRightWidth: 14, borderRightColor: 'transparent',
        borderTopWidth: 28, borderTopColor: Theme.colors.text,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 8,
    },
    centerDot: {
        position: 'absolute',
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: Theme.colors.background,
        borderWidth: 3, borderColor: Theme.colors.text,
        zIndex: 11,
    },
    winnerOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(15,15,30,0.92)',
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.primary,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.lg,
        alignItems: 'center',
        maxWidth: 200,
    },
    winnerEmoji: { fontSize: 28, marginBottom: 4 },
    winnerLabel: {
        fontSize: 20,
        fontWeight: '900',
        color: Theme.colors.text,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    emptyContainer: { alignItems: 'center', padding: Theme.spacing.xl },
    emptyTitle: {
        color: Theme.colors.text,
        marginTop: Theme.spacing.md,
        fontSize: 17,
        fontWeight: '700',
    },
    emptyHint: {
        color: Theme.colors.textSecondary,
        marginTop: Theme.spacing.sm,
        fontSize: 14,
        textAlign: 'center',
    },
    controls: {
        padding: Theme.spacing.md,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderTopLeftRadius: Theme.borderRadius.xl,
        borderTopRightRadius: Theme.borderRadius.xl,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.surfaceBorder,
    },
    inputRow: { flexDirection: 'row', marginBottom: Theme.spacing.md, gap: Theme.spacing.sm },
    input: {
        flex: 1,
        backgroundColor: Theme.colors.surface,
        color: Theme.colors.text,
        padding: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.surfaceBorder,
        fontSize: 16,
        minHeight: 52,
    },
    addBtn: {
        backgroundColor: Theme.colors.primary,
        width: 52, height: 52,
        borderRadius: Theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: { maxHeight: 130, marginBottom: Theme.spacing.md },
    listContent: { paddingBottom: Theme.spacing.sm },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
    },
    listText: { fontSize: 15, color: Theme.colors.text, fontWeight: '600', flex: 1, marginRight: Theme.spacing.sm },
    spinBtn: { marginBottom: Platform.OS === 'ios' ? 0 : Theme.spacing.sm },
});
