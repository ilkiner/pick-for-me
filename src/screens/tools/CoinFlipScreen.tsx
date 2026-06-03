import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickEngine } from '../../core/PickEngine';
import { Theme } from '../../core/Theme';
import { ModernButton } from '../../components/ModernButton';

export default function CoinFlipScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const [isFlipping, setIsFlipping] = useState(false);
    const [flipCount, setFlipCount] = useState(0);
    const [targetCount, setTargetCount] = useState(8);
    
    // Animation refs
    const flipAnim = useRef(new Animated.Value(0)).current;
    const liftAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const stats = await AsyncStorage.getItem('@coin_stats');
            if (stats) {
                const { count, target } = JSON.parse(stats);
                setFlipCount(count);
                setTargetCount(target);
            } else {
                const initialTarget = Math.floor(Math.random() * 5) + 6; // 6-10
                setTargetCount(initialTarget);
                await AsyncStorage.setItem('@coin_stats', JSON.stringify({ count: 0, target: initialTarget }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleFlip = async () => {
        if (isFlipping) return;
        setIsFlipping(true);

        const newCount = flipCount + 1;
        let isEdge = false;
        let finalTarget = targetCount;

        if (newCount >= targetCount) {
            isEdge = true;
            finalTarget = Math.floor(Math.random() * 5) + 6; // New target
            await AsyncStorage.setItem('@coin_stats', JSON.stringify({ count: 0, target: finalTarget }));
            setFlipCount(0);
            setTargetCount(finalTarget);
        } else {
            await AsyncStorage.setItem('@coin_stats', JSON.stringify({ count: newCount, target: targetCount }));
            setFlipCount(newCount);
        }

        const result = PickEngine.flipCoin(isEdge);

        // Sequence: Lift up + multiple rotations
        const numSpins = isEdge ? 6.25 : (result === 'heads' ? 6 : 7); // edge stops at 90deg offset roughly or we handle visually
        
        Animated.parallel([
            Animated.sequence([
                Animated.timing(liftAnim, { toValue: -150, duration: 400, useNativeDriver: true }),
                Animated.timing(liftAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
            Animated.timing(flipAnim, {
                toValue: numSpins,
                duration: 800,
                useNativeDriver: true,
            })
        ]).start(() => {
            setIsFlipping(false);
            navigation.navigate('Result', { result, type: 'coin', sourceRoute: 'CoinFlip' });
            // Reset to normalized state after navigation
            setTimeout(() => {
                flipAnim.setValue(result === 'heads' ? 0 : (result === 'edge' ? 0.25 : 1));
            }, 500);
        });
    };

    const frontRotation = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    const backRotation = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg']
    });

    const isTurkish = i18n.language === 'tr';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessibilityLabel="Geri"
                    accessibilityRole="button"
                >
                    <Ionicons name="chevron-back" size={26} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('tools.coin.title')}</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.coinWrapper}>
                    {/* Coin Animation Container */}
                    <Animated.View style={[
                        styles.coinContainer,
                        { transform: [{ translateY: liftAnim }] }
                    ]}>
                        {/* Front Side (Heads) */}
                        <Animated.View style={[
                            styles.coinFace,
                            styles.frontFace,
                            { transform: [{ rotateY: frontRotation }], backfaceVisibility: 'hidden' }
                        ]}>
                             <View style={styles.coinDetail}>
                                <Text style={styles.coinLabel}>{t('tools.coin.heads_label')}</Text>
                                <Ionicons name="person-circle-outline" size={60} color="#FFD700" />
                             </View>
                        </Animated.View>

                        {/* Back Side (Tails) */}
                        <Animated.View style={[
                            styles.coinFace,
                            styles.backFace,
                            { transform: [{ rotateY: backRotation }], backfaceVisibility: 'hidden' }
                        ]}>
                            <View style={[styles.coinDetail, { borderColor: '#C0C0C0' }]}>
                                <Text style={[styles.coinLabel, { color: '#C0C0C0' }]}>{t('tools.coin.tails_label')}</Text>
                                <Ionicons name="leaf-outline" size={60} color="#C0C0C0" />
                            </View>
                        </Animated.View>
                    </Animated.View>
                </View>

                <Text style={styles.hintText}>{t('tools.coin.hint')}</Text>
            </View>

            <View style={styles.footer}>
                <ModernButton
                    title={isFlipping ? t('tools.coin.flipping') : t('tools.coin.flip')}
                    onPress={handleFlip}
                    disabled={isFlipping}
                    variant="primary"
                    style={styles.flipBtn}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.lg },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.surfaceBorder },
    title: { fontSize: 24, fontWeight: '800', color: Theme.colors.text, letterSpacing: 1 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    coinWrapper: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
    coinContainer: { width: 180, height: 180, position: 'relative' },
    coinFace: { 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        borderRadius: 90, 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    frontFace: { backgroundColor: '#FFD700', borderWidth: 4, borderColor: '#DAA520' }, // Gold
    backFace: { backgroundColor: '#E8E8E8', borderWidth: 4, borderColor: '#C0C0C0' }, // Silver
    coinDetail: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 2,
        borderColor: '#DAA520',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coinLabel: { fontSize: 20, fontWeight: '900', color: '#DAA520', marginBottom: 5 },
    hintText: { marginTop: 60, fontSize: 18, color: Theme.colors.textSecondary, fontWeight: '600' },
    footer: { padding: Theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? Theme.spacing.md : Theme.spacing.xl },
    flipBtn: { width: '100%' }
});

