import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';

type IdeaMode = 'app' | 'my';
type Mood = 'all' | 'relaxed' | 'productive' | 'fun' | 'social';
type Location = 'all' | 'home' | 'outside' | 'anywhere';

interface Idea {
    text: string;
    mood?: Mood;
    location?: Location;
}

// APP_IDEAS moved to i18n JSON files


export default function IdeaGeneratorScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<IdeaMode>('app');
    const [moodFilter, setMoodFilter] = useState<Mood>('all');
    const [locationFilter, setLocationFilter] = useState<Location>('all');

    const appIdeasList = t('tools.idea.app_ideas_list', { returnObjects: true }) as Idea[];

    
    const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
    const [currentIdea, setCurrentIdea] = useState<Idea | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [displayedText, setDisplayedText] = useState(t('tools.idea.placeholder'));

    // Animation values
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadMyIdeas();
    }, []);

    const loadMyIdeas = async () => {
        try {
            const stored = await AsyncStorage.getItem('@my_ideas');
            if (stored) setMyIdeas(JSON.parse(stored));
        } catch (e) {
            console.error('Failed to load my ideas', e);
        }
    };

    const getFilteredIdeas = useCallback(() => {
        const source = mode === 'app' ? appIdeasList : myIdeas;
        return source.filter(idea => {
            const matchMood = moodFilter === 'all' || idea.mood === moodFilter;
            const matchLoc = locationFilter === 'all' || idea.location === locationFilter;
            return matchMood && matchLoc;
        });
    }, [mode, moodFilter, locationFilter, myIdeas]);

    const runSlotAnimation = (finalIdea: Idea) => {
        const filtered = getFilteredIdeas();
        const fallbackTexts = filtered.length > 3 ? filtered.map(f => f.text) : appIdeasList.map(f => f.text);
        
        let counter = 0;
        const maxTicks = 15;
        const intervalTime = 80;

        const interval = setInterval(() => {
            counter++;
            
            // Randomly switch text during animation
            setDisplayedText(fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)]);
            
            // Jitter animation up and down slightly
            Animated.sequence([
                Animated.timing(translateY, { toValue: -10, duration: intervalTime / 2, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 10, duration: intervalTime / 2, useNativeDriver: true })
            ]).start();

            if (counter >= maxTicks) {
                clearInterval(interval);
                
                // Final reveal animation
                Animated.parallel([
                    Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true })
                ]).start();

                setCurrentIdea(finalIdea);
                setDisplayedText(finalIdea.text);
                setIsShuffling(false);
            }
        }, intervalTime);
    };

    const generateIdea = () => {
        setIsShuffling(true);
        setCurrentIdea(null);
        opacity.setValue(0.5); // dim slightly during shuffle
        
        const filtered = getFilteredIdeas();
        if (filtered.length === 0) {
            setDisplayedText('No ideas match your filters!');
            setIsShuffling(false);
            return;
        }

        const random = filtered[Math.floor(Math.random() * filtered.length)];
        runSlotAnimation(random);
    };

    const [newIdeaText, setNewIdeaText] = useState('');

    const addCustomIdea = async () => {
        if (!newIdeaText.trim()) return;
        const newIdea: Idea = { text: newIdeaText.trim(), mood: 'all', location: 'anywhere' };
        const updated = [...myIdeas, newIdea];
        setMyIdeas(updated);
        setNewIdeaText('');
        await AsyncStorage.setItem('@my_ideas', JSON.stringify(updated));
    };

    const deleteIdea = async (index: number) => {
        const updated = myIdeas.filter((_, i) => i !== index);
        setMyIdeas(updated);
        await AsyncStorage.setItem('@my_ideas', JSON.stringify(updated));
    };

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
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>{t('tools.idea.title')}</Text>
                    <Text style={styles.subtitle}>{t('tools.idea.subtitle')}</Text>
                </View>
                <View style={{ width: 38 }} />
            </View>

            <View style={styles.modeContainer}>
                <TouchableOpacity 
                    style={[styles.modeBtn, mode === 'app' && styles.modeBtnActive]} 
                    onPress={() => setMode('app')}>
                    <Text style={[styles.modeText, mode === 'app' && styles.modeTextActive]}>{t('tools.idea.app_ideas')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.modeBtn, mode === 'my' && styles.modeBtnActive]} 
                    onPress={() => setMode('my')}>
                    <Text style={[styles.modeText, mode === 'my' && styles.modeTextActive]}>{t('tools.idea.my_ideas')}</Text>
                </TouchableOpacity>
            </View>

            {mode === 'app' ? (
                <View style={styles.filtersContainer}>
                    <Text style={styles.filterLabel}>{t('tools.idea.mood_filter')}</Text>
                    {['all', 'relaxed', 'productive', 'fun', 'social'].map(m => (
                        <TouchableOpacity key={m} onPress={() => setMoodFilter(m as Mood)}>
                           <Text style={[styles.filterText, moodFilter === m && styles.filterActive]}>
                               {t(`tools.idea.moods.${m}`)}
                           </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View style={styles.customContainer}>
                    <View style={styles.inputRow}>
                        <View style={styles.inputWrapper}>
                             <Text style={{color: Theme.colors.textSecondary, marginBottom: 5, fontSize: 12}}>{t('tools.idea.add_label', 'New Idea:')}</Text>
                             <TextInput
                                style={styles.textInput}
                                value={newIdeaText}
                                onChangeText={setNewIdeaText}
                                placeholder={t('tools.idea.placeholder_custom', 'Type here...')}
                                placeholderTextColor="#888"
                             />
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={addCustomIdea}>
                            <Ionicons name="add" size={30} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <Animated.ScrollView style={styles.myIdeasList} contentContainerStyle={{paddingBottom: 20}}>
                        {myIdeas.length === 0 ? (
                            <Text style={styles.emptyText}>{t('tools.idea.empty_my_ideas', 'No custom ideas yet.')}</Text>
                        ) : (
                            myIdeas.map((item, idx) => (
                                <View key={idx} style={styles.myIdeaItem}>
                                    <Text style={styles.myIdeaItemText} numberOfLines={1}>{item.text}</Text>
                                    <TouchableOpacity onPress={() => deleteIdea(idx)}>
                                        <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </Animated.ScrollView>
                </View>
            )}

            <GlassCard style={styles.resultCard}>
                <Animated.View style={{ transform: [{ translateY }], opacity, alignItems: 'center', justifyContent: 'center' }}>
                    {currentIdea && !isShuffling && currentIdea.mood && currentIdea.mood !== 'all' && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{currentIdea.mood.toUpperCase()}</Text>
                        </View>
                    )}
                    <Text style={[styles.ideaText, isShuffling && styles.ideaTextBlur]}>{displayedText}</Text>
                </Animated.View>
            </GlassCard>

            <TouchableOpacity style={styles.generateBtn} onPress={generateIdea} disabled={isShuffling}>
                <Text style={styles.generateBtnText}>{t('tools.idea.generate')}</Text>
            </TouchableOpacity>

            {currentIdea && !isShuffling && currentIdea.text !== 'No ideas match your filters!' && (
                <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>{t('tools.idea.feedback_label')}</Text>
                    <View style={styles.feedbackBtns}>
                        <TouchableOpacity 
                            style={[styles.fBtn, styles.fBtnYes]}
                            onPress={() => navigation.navigate('Result', { result: currentIdea.text, type: 'idea' })}>
                            <Ionicons name="checkmark" size={24} color="#FFF" />
                            <Text style={styles.fBtnText}>{t('tools.idea.feedback_yes')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.fBtn, styles.fBtnNo]} onPress={() => setCurrentIdea(null)}>
                            <Ionicons name="close" size={24} color="#FFF" />
                            <Text style={styles.fBtnText}>{t('tools.idea.feedback_no')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background, padding: Theme.spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Theme.colors.surface,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Theme.colors.surfaceBorder,
    },
    headerTitleContainer: { alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: Theme.colors.text },
    subtitle: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4 },
    modeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 10 },
    modeBtn: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
    modeBtnActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
    modeText: { color: Theme.colors.textSecondary, fontWeight: '600' },
    modeTextActive: { color: '#FFF' },
    filtersContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' },
    filterLabel: { color: '#888', marginRight: 5 },
    filterText: { color: '#555', padding: 5, borderRadius: 10 },
    filterActive: { color: Theme.colors.primary, fontWeight: 'bold' },
    customContainer: { marginBottom: 20, height: 180 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 15 },
    inputWrapper: { flex: 1 },
    inputCard: { backgroundColor: Theme.colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Theme.colors.surfaceBorder },
    textInput: { backgroundColor: Theme.colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Theme.colors.surfaceBorder, color: Theme.colors.text, fontSize: 14 },
    addBtn: { backgroundColor: Theme.colors.primary, width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    myIdeasList: { flex: 1 },
    myIdeaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, marginBottom: 5 },
    myIdeaItemText: { color: Theme.colors.text, fontSize: 14, flex: 1, marginRight: 10 },
    emptyText: { color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
    resultCard: { minHeight: 180, justifyContent: 'center', alignItems: 'center', padding: 20, marginBottom: 30, overflow: 'hidden' },
    ideaText: { fontSize: 24, color: Theme.colors.text, textAlign: 'center', fontWeight: 'bold' },
    ideaTextBlur: { color: '#A0A0A0', opacity: 0.8 }, 
    badge: { backgroundColor: '#FFD60A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
    badgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    generateBtn: { backgroundColor: Theme.colors.primary, padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 30 },
    generateBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    feedbackContainer: { alignItems: 'center' },
    feedbackLabel: { color: Theme.colors.textSecondary, marginBottom: 10 },
    feedbackBtns: { flexDirection: 'row', gap: 20 },
    fBtn: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 5, minWidth: 80, justifyContent: 'center' },
    fBtnYes: { backgroundColor: Theme.colors.success },
    fBtnNo: { backgroundColor: Theme.colors.error },
    fBtnText: { color: '#FFF', fontWeight: 'bold' }
});
