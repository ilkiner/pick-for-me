import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PickEngine } from '../../core/PickEngine';
import { LocalStorage } from '../../storage/local';
import { useTheme } from '../../store/ThemeContext';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { ModernButton } from '../../components/ModernButton';
import MOVIES_DATA from '../../content/movies.json';

export default function MoviePickerScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
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
                        <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
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
                            placeholderTextColor={theme.colors.textSecondary}
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
                                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                            </TouchableOpacity>
                        </GlassCard>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="videocam-outline" size={60} color={theme.colors.surfaceBorder} />
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

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, letterSpacing: 1 },
    quickAddScroll: { marginBottom: theme.spacing.md },
    quickAddContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: 8 },
    quickAddBtn: { backgroundColor: theme.colors.surface, paddingVertical: 10, paddingHorizontal: 14, borderRadius: theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.surfaceBorder },
    clearBtn: { borderColor: 'rgba(239, 68, 68, 0.3)' },
    quickAddText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
    inputSection: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
    inputContainer: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder, fontSize: 16 },
    addBtn: { backgroundColor: theme.colors.success, width: 56, height: 56, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    list: { flex: 1 },
    listContent: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderRadius: theme.borderRadius.md },
    listText: { fontSize: 16, color: theme.colors.text, fontWeight: '600', flex: 1, marginRight: theme.spacing.md },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: theme.colors.textSecondary, marginTop: theme.spacing.md, fontWeight: '500' },
    footer: { padding: theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.xl },
    pickBtn: { width: '100%' }
    });
}

