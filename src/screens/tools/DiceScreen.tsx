import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PickEngine } from '../../core/PickEngine';
import DiceFace from '../../components/DiceFace';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';

const { width } = Dimensions.get('window');

export default function DiceScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [diceCount, setDiceCount] = useState<1 | 2>(2); // Default to 2 based on image
    const [results, setResults] = useState<number[]>([]);
    const [isRolling, setIsRolling] = useState(false);
    const [useButton, setUseButton] = useState(true);

    const translateX = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const totalSum = results.reduce((a, b) => a + b, 0);

    const handleRoll = () => {
        if (isRolling) return;

        setIsRolling(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Shake and rotate animation
        Animated.parallel([
            Animated.sequence([
                Animated.timing(translateX, { toValue: -15, duration: 50, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 15, duration: 50, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]),
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(() => {
            rotateAnim.setValue(0);
            completeRoll();
        });
    };

    const completeRoll = () => {
        const newResults = PickEngine.rollDice(diceCount, 6);
        setResults(newResults);
        setIsRolling(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Top Header with Switch */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t('tools.dice.play_with_button')}</Text>
                        <Switch 
                            value={useButton} 
                            onValueChange={setUseButton}
                            trackColor={{ false: '#767577', true: '#4ade80' }}
                            thumbColor={useButton ? '#FFF' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Instruction and Sum */}
                <View style={styles.topInfo}>
                    <Text style={styles.instruction}>{t('tools.dice.tap_to_roll')}</Text>
                    {results.length > 0 && (
                        <Text style={styles.sumText}>{totalSum}</Text>
                    )}
                </View>

                {/* Dice Display Area */}
                <View style={styles.diceContent}>
                    <Animated.View style={[
                        styles.diceRow,
                        { transform: [{ translateX }, { rotate: rotation }] }
                    ]}>
                        {(results.length > 0 ? results : Array(diceCount).fill(1)).map((val, idx) => (
                            <View key={idx} style={styles.diceWrapper}>
                                <DiceFace value={val} size={diceCount === 1 ? 140 : 110} />
                            </View>
                        ))}
                    </Animated.View>
                </View>

                {/* Selection and Action Footer */}
                <View style={styles.footer}>
                    <View style={styles.countSelector}>
                        <TouchableOpacity 
                            style={[styles.countBtn, diceCount === 1 && styles.countBtnActive]}
                            onPress={() => setDiceCount(1)}
                        >
                            <Text style={styles.countBtnText}>{t('tools.dice.one_dice')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.countBtn, diceCount === 2 && styles.countBtnActive]}
                            onPress={() => setDiceCount(2)}
                        >
                            <Text style={styles.countBtnText}>{t('tools.dice.two_dice')}</Text>
                        </TouchableOpacity>
                    </View>

                    {useButton && (
                        <TouchableOpacity 
                            style={styles.actionButton} 
                            onPress={handleRoll}
                            disabled={isRolling}
                        >
                            <Ionicons name="send" size={32} color="#FFF" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#008B8B', // Teal background
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    backBtn: {
        padding: 5,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    switchLabel: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    topInfo: {
        alignItems: 'center',
        marginTop: 20,
    },
    instruction: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    sumText: {
        color: '#FFF',
        fontSize: 80,
        fontWeight: '900',
    },
    diceContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    diceRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    diceWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    countSelector: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 25,
        padding: 5,
        marginBottom: 40,
    },
    countBtn: {
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
    },
    countBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    countBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    actionButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#4ade80', // Green button
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
});



