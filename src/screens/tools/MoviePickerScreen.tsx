import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PickEngine } from '../../core/PickEngine';
import { LocalStorage } from '../../storage/local';
import { Theme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { ModernButton } from '../../components/ModernButton';
import MOVIES_DATA from '../../content/movies.json';

export default function MoviePickerScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [movies, setMovies] = useState<string[]>([]);
    const [newMovie, setNewMovie] = useState('');

    useEffect(() => {
        LocalStorage.getItem('movieOptions').then((data: any) => {
            if (data) setMovies(data);
        });
    }, []);

    const saveOptions = (newOpts: any) => {
        setMovies(newOpts);
        LocalStorage.setItem('movieOptions', newOpts);
    };

    const addOption = () => {
        if (!newMovie.trim()) return;
        const newOpts = [...movies, newMovie.trim()];
        saveOptions(newOpts);
        setNewMovie('');
    };

    const removeOption = (index: number) => {
        const newOpts = movies.filter((_, i) => i !== index);
        saveOptions(newOpts);
    };

    const moviesData = MOVIES_DATA as Record<string, string[]>;

    const addPredefinedList = (list: string[]) => {
        const newOpts = Array.from(new Set([...movies, ...list]));
        saveOptions(newOpts);
    };

    const handlePick = () => {
        if (movies.length === 0) return;
        const result = PickEngine.pickMovie(movies);
        navigation.navigate('Result', { result, type: 'movie', sourceRoute: 'MoviePicker' });
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={Theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('tools.movie.title')}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddScroll} contentContainerStyle={styles.quickAddContainer}>
                    <TouchableOpacity style={styles.quickAddBtn} onPress={() => addPredefinedList(moviesData.imdb_top)}>
                        <Text style={styles.quickAddText}>{t('tools.movie.imdb_top')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickAddBtn} onPress={() => addPredefinedList(moviesData.netflix)}>
                        <Text style={styles.quickAddText}>{t('tools.movie.netflix')}</Text>
                    </TouchableOpacity>
                    {(['action', 'comedy', 'horror', 'scifi', 'romance', 'animation'] as const).map(genre => (
                        <TouchableOpacity key={genre} style={styles.quickAddBtn} onPress={() => addPredefinedList(moviesData[genre])}>
                            <Text style={styles.quickAddText}>{t(`tools.movie.genre_${genre}`, genre)}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={[styles.quickAddBtn, styles.clearBtn]} onPress={() => saveOptions([])}>
                        <Text style={styles.quickAddText}>{t('tools.common.clear', 'Temizle')}</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.inputSection}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={t('tools.movie.placeholder')}
                            placeholderTextColor={Theme.colors.textSecondary}
                            value={newMovie}
                            onChangeText={setNewMovie}
                            onSubmitEditing={addOption}
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={addOption} accessibilityLabel={t('tools.movie.add_movie')} accessibilityRole="button">
                            <Ionicons name="add" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={movies}
                    keyExtractor={(item, index) => index.toString()}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => (
                        <GlassCard style={styles.listItem}>
                            <Text style={styles.listText}>{item}</Text>
                            <TouchableOpacity onPress={() => removeOption(index)} accessibilityLabel={t('tools.wheel.delete')} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
                            </TouchableOpacity>
                        </GlassCard>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="videocam-outline" size={60} color={Theme.colors.surfaceBorder} />
                            <Text style={styles.emptyText}>{t('tools.movie.empty')}</Text>
                        </View>
                    }
                />

                <View style={styles.footer}>
                    <ModernButton
                        title={t('tools.movie.pick')}
                        onPress={handlePick}
                        disabled={movies.length === 0}
                        variant="primary"
                        style={styles.pickBtn}
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
    quickAddScroll: { marginBottom: Theme.spacing.md },
    quickAddContainer: { flexDirection: 'row', paddingHorizontal: Theme.spacing.md, gap: 8 },
    quickAddBtn: { backgroundColor: Theme.colors.surface, paddingVertical: 10, paddingHorizontal: 14, borderRadius: Theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.surfaceBorder },
    clearBtn: { borderColor: 'rgba(239, 68, 68, 0.3)' },
    quickAddText: { color: Theme.colors.text, fontSize: 12, fontWeight: '700' },
    inputSection: { paddingHorizontal: Theme.spacing.md, marginBottom: Theme.spacing.md },
    inputContainer: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, backgroundColor: Theme.colors.surface, color: Theme.colors.text, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.surfaceBorder, fontSize: 16 },
    addBtn: { backgroundColor: Theme.colors.success, width: 56, height: 56, borderRadius: Theme.borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    list: { flex: 1 },
    listContent: { paddingHorizontal: Theme.spacing.md, paddingBottom: Theme.spacing.lg },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Theme.spacing.md, marginBottom: Theme.spacing.sm, borderRadius: Theme.borderRadius.md },
    listText: { fontSize: 16, color: Theme.colors.text, fontWeight: '600', flex: 1, marginRight: Theme.spacing.md },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: Theme.colors.textSecondary, marginTop: Theme.spacing.md, fontWeight: '500' },
    footer: { padding: Theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? Theme.spacing.md : Theme.spacing.xl },
    pickBtn: { width: '100%' }
});

