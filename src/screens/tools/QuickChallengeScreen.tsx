import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';

// CHALLENGES moved to i18n


export default function QuickChallengeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const challengesList = t('tools.challenge.list', { returnObjects: true }) as string[];
    const [challenge, setChallenge] = useState<string | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [displayedText, setDisplayedText] = useState(t('tools.challenge.placeholder'));

    // Slot machine animation vectors
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const runSlotAnimation = (finalChallenge: string) => {
        let counter = 0;
        const maxTicks = 12;
        const intervalTime = 70;

        const interval = setInterval(() => {
            counter++;
            setDisplayedText(challengesList[Math.floor(Math.random() * challengesList.length)]);
            
            Animated.sequence([
                Animated.timing(translateY, { toValue: -8, duration: intervalTime / 2, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 8, duration: intervalTime / 2, useNativeDriver: true })
            ]).start();

            if (counter >= maxTicks) {
                clearInterval(interval);
                
                Animated.parallel([
                    Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true })
                ]).start();

                setChallenge(finalChallenge);
                setDisplayedText(finalChallenge);
                setIsShuffling(false);
            }
        }, intervalTime);
    };

    const generateChallenge = () => {
        setIsShuffling(true);
        setChallenge(null);
        opacity.setValue(0.6);
        
        const random = challengesList[Math.floor(Math.random() * challengesList.length)];
        runSlotAnimation(random);
    };

    // Note: The feedback buttons do not currently post to ResultScreen logic since they are quick offline exercises, 
    // but the global architecture remains unaffected and ready for future integrations.

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>{t('tools.challenge.title')}</Text>
                    <Text style={styles.subtitle}>{t('tools.challenge.subtitle')}</Text>
                </View>
                <View style={{ width: 38 }} />
            </View>

            <GlassCard style={styles.resultCard}>
                <Animated.View style={{ transform: [{ translateY }], opacity, alignItems: 'center' }}>
                    <Text style={[styles.challengeText, isShuffling && styles.challengeTextBlur]}>
                        {displayedText}
                    </Text>
                </Animated.View>
            </GlassCard>

            <TouchableOpacity style={styles.generateBtn} onPress={generateChallenge} disabled={isShuffling}>
                <Text style={styles.generateBtnText}>{t('tools.challenge.generate')}</Text>
            </TouchableOpacity>

            {challenge && !isShuffling && (
                <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>{t('tools.challenge.feedback_label')}</Text>
                    <View style={styles.feedbackBtns}>
                        <TouchableOpacity 
                            style={[styles.fBtn, styles.fBtnYes]}
                            onPress={() => navigation.navigate('Result', { result: challenge, type: 'challenge' })}>
                            <Ionicons name="checkmark-done" size={24} color="#FFF" />
                            <Text style={styles.fBtnText}>{t('tools.challenge.feedback_yes')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.fBtn, styles.fBtnSkip]}>
                            <Ionicons name="play-skip-forward" size={24} color="#FFF" />
                            <Text style={styles.fBtnText}>{t('tools.challenge.feedback_no')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background, padding: Theme.spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, marginTop: 10 },
    backBtn: { padding: 5 },
    headerTitleContainer: { alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: Theme.colors.text },
    subtitle: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
    resultCard: { minHeight: 200, justifyContent: 'center', alignItems: 'center', padding: 30, marginBottom: 40, overflow: 'hidden' },
    challengeText: { fontSize: 28, color: Theme.colors.text, textAlign: 'center', fontWeight: 'bold' },
    challengeTextBlur: { color: '#FF9500', opacity: 0.8 },
    generateBtn: { backgroundColor: Theme.colors.primary, padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 30 },
    generateBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    feedbackContainer: { alignItems: 'center' },
    feedbackLabel: { color: Theme.colors.textSecondary, marginBottom: 15, fontSize: 16 },
    feedbackBtns: { flexDirection: 'row', gap: 20 },
    fBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, gap: 8, minWidth: 120, justifyContent: 'center' },
    fBtnYes: { backgroundColor: Theme.colors.success },
    fBtnSkip: { backgroundColor: '#FF9500' },
    fBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
