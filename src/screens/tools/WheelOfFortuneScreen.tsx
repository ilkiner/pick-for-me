import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PickEngine } from '../../core/PickEngine';
import { LocalStorage } from '../../storage/local';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { ModernButton } from '../../components/ModernButton';

export default function WheelOfFortuneScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
    const [newOption, setNewOption] = useState('');
    const [isSpinning, setIsSpinning] = useState(false);
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        LocalStorage.getItem('wheelOptions').then((data: any) => {
            if (data) setOptions(data);
        });
    }, []);

    const saveOptions = (newOpts: any) => {
        setOptions(newOpts);
        LocalStorage.setItem('wheelOptions', newOpts);
    };

    const addOption = () => {
        if (!newOption.trim()) return;
        const newOpts = [...options, { id: Date.now().toString(), label: newOption.trim() }];
        saveOptions(newOpts);
        setNewOption('');
    };

    const removeOption = (id: string) => {
        const newOpts = options.filter(o => o.id !== id);
        saveOptions(newOpts);
    };

    const handleSpin = () => {
        if (options.length === 0 || isSpinning) return;

        setIsSpinning(true);
        const fullSpins = 5;
        const selectedIndex = Math.floor(Math.random() * options.length);
        const result = options[selectedIndex];
        
        const N = options.length;
        // Segment i center is at (i + 0.5) * (360/N)
        // To put it at top, we need to rotate by -centerAngle.
        // In positive degrees: 360 - centerAngle.
        const extraRotationFactor = 1 - (selectedIndex + 0.5) / N;
        const finalValue = fullSpins + extraRotationFactor;

        Animated.timing(spinAnim, {
            toValue: finalValue,
            duration: 4000,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
        }).start(() => {
            setIsSpinning(false);
            navigation.navigate('Result', { result, type: 'wheel', sourceRoute: 'WheelOfFortune' });
            // Clean up: Reset to a normalized value after a short delay so it doesn't jump instantly
            setTimeout(() => {
                spinAnim.setValue(finalValue % 1);
            }, 500);
        });
    };

    const renderWheel = () => {
        if (options.length === 0) return null;
        const radius = 140;
        const centerX = 150;
        const centerY = 150;
        const anglePerSegment = 360 / options.length;
        const colors = [Theme.colors.primary, Theme.colors.secondary, Theme.colors.accent, Theme.colors.error, Theme.colors.success, '#F59E0B'];

        return (
            <View style={styles.wheelContainer}>
                <Animated.View style={{
                    transform: [{
                        rotate: spinAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                        })
                    }]
                }}>
                    <Svg width={300} height={300} viewBox="0 0 300 300">
                        <G>
                            {options.map((option, i) => {
                                const startAngle = i * anglePerSegment;
                                const endAngle = (i + 1) * anglePerSegment;
                                const x1 = centerX + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
                                const y1 = centerY + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
                                const x2 = centerX + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
                                const y2 = centerY + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);
                                const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

                                // Text position
                                const textAngle = startAngle + anglePerSegment / 2 - 90;
                                const textX = centerX + (radius * 0.6) * Math.cos((Math.PI * textAngle) / 180);
                                const textY = centerY + (radius * 0.6) * Math.sin((Math.PI * textAngle) / 180);

                                return (
                                    <G key={option.id}>
                                        <Path d={pathData} fill={colors[i % colors.length]} stroke={Theme.colors.background} strokeWidth="2" />
                                        <SvgText
                                            x={textX}
                                            y={textY}
                                            fill="#fff"
                                            fontSize="12"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                                        >
                                            {option.label.length > 8 ? option.label.substring(0, 6) + '...' : option.label}
                                        </SvgText>
                                    </G>
                                );
                            })}
                        </G>
                    </Svg>
                </Animated.View>
                <View style={styles.pointer} />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={Theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('tools.wheel.title')}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.wheelContent}>
                    {options.length > 0 ? renderWheel() : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="aperture-outline" size={100} color={Theme.colors.surfaceBorder} />
                            <Text style={styles.emptyText}>{t('tools.wheel.empty')}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.controlsContainer}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder={t('tools.wheel.placeholder')}
                            placeholderTextColor={Theme.colors.textSecondary}
                            value={newOption}
                            onChangeText={setNewOption}
                            onSubmitEditing={addOption}
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={addOption}>
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
                                <Text style={styles.listText}>{item.label}</Text>
                                <TouchableOpacity onPress={() => removeOption(item.id)}>
                                    <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
                                </TouchableOpacity>
                            </GlassCard>
                        )}
                    />

                    <ModernButton
                        title={isSpinning ? t('tools.wheel.spinning') : t('tools.wheel.spin')}
                        onPress={handleSpin}
                        disabled={options.length === 0 || isSpinning}
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.lg },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.surfaceBorder },
    title: { fontSize: 24, fontWeight: '800', color: Theme.colors.text, letterSpacing: 1 },
    wheelContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wheelContainer: { alignItems: 'center', justifyContent: 'center' },
    pointer: {
        position: 'absolute',
        top: -10,
        width: 0,
        height: 0,
        borderLeftWidth: 15,
        borderLeftColor: 'transparent',
        borderRightWidth: 15,
        borderRightColor: 'transparent',
        borderTopWidth: 30,
        borderTopColor: Theme.colors.text,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    emptyContainer: { alignItems: 'center' },
    emptyText: { color: Theme.colors.textSecondary, marginTop: Theme.spacing.md, fontSize: 16, fontWeight: '500' },
    controlsContainer: { padding: Theme.spacing.md, backgroundColor: 'rgba(255,255,255,0.02)', borderTopLeftRadius: Theme.borderRadius.xl, borderTopRightRadius: Theme.borderRadius.xl, borderTopWidth: 1, borderTopColor: Theme.colors.surfaceBorder },
    inputRow: { flexDirection: 'row', marginBottom: Theme.spacing.md },
    input: { flex: 1, backgroundColor: Theme.colors.surface, color: Theme.colors.text, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.surfaceBorder, fontSize: 16 },
    addBtn: { backgroundColor: Theme.colors.primary, height: 56, width: 56, borderRadius: Theme.borderRadius.md, marginLeft: Theme.spacing.sm, justifyContent: 'center', alignItems: 'center' },
    list: { maxHeight: 150, marginBottom: Theme.spacing.md },
    listContent: { paddingBottom: 10 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Theme.spacing.md, marginBottom: Theme.spacing.sm, borderRadius: Theme.borderRadius.md },
    listText: { fontSize: 16, color: Theme.colors.text, fontWeight: '600' },
    spinBtn: { marginBottom: Platform.OS === 'ios' ? 0 : Theme.spacing.md }
});

