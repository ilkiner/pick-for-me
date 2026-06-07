import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    TextInput, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { AppTheme } from '../../core/Theme';
import { GlassCard } from '../../components/GlassCard';
import { SavedListsStorage, SavedList, ListType } from '../../storage/savedLists';
import { usePro, FREE_LIST_LIMIT, FREE_ITEM_LIMIT } from '../../store/ProContext';
import { ProGateModal } from '../../components/ProGate';
import { useTheme } from '../../store/ThemeContext';

const LIST_TYPE_ICONS: Record<ListType, string> = {
    wheel: 'aperture',
    movie: 'film',
    order: 'list',
    general: 'bookmark',
};

function getListTypeColors(theme: AppTheme): Record<ListType, string> {
    return {
        wheel: theme.colors.secondary,
        movie: theme.colors.success,
        order: theme.colors.accent,
        general: theme.colors.primary,
    };
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: {
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md,
            justifyContent: 'space-between',
        },
        backBtn: {
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: theme.colors.surface,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: theme.colors.surfaceBorder,
        },
        headerCenter: { alignItems: 'center', flex: 1, marginHorizontal: theme.spacing.sm },
        title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
        subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
        limitBadge: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '600' },
        addHeaderBtn: {
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'rgba(99,102,241,0.15)',
            alignItems: 'center', justifyContent: 'center',
        },
        listContent: { padding: theme.spacing.md, paddingBottom: 100 },
        listCard: { marginBottom: theme.spacing.sm, borderRadius: theme.borderRadius.lg },
        listCardInner: {
            flexDirection: 'row', alignItems: 'center',
            padding: theme.spacing.md, gap: theme.spacing.md,
        },
        typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        listInfo: { flex: 1 },
        listName: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
        listMeta: { fontSize: 12, color: theme.colors.textSecondary },
        actionBtns: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
        emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.md },
        emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
        emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
        createBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md,
            borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.md,
        },
        createBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
        fab: { position: 'absolute', bottom: 32, right: 24 },
        fabBtn: {
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: theme.colors.primary,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
        },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
        modalSheet: {
            backgroundColor: theme.colors.modalSheet,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: theme.spacing.lg, paddingBottom: 40,
            borderTopWidth: 1, borderTopColor: theme.colors.surfaceBorder,
        },
        modalTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginBottom: theme.spacing.lg, textAlign: 'center' },
        fieldLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: theme.spacing.md },
        modalInput: {
            backgroundColor: theme.colors.surface, color: theme.colors.text,
            borderRadius: theme.borderRadius.md, padding: theme.spacing.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder, fontSize: 15, minHeight: 52,
        },
        modalTextArea: { minHeight: 120, maxHeight: 200 },
        typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        typeChip: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 12, paddingVertical: 8,
            borderRadius: 20, borderWidth: 1, borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
        },
        typeChipText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
        modalBtns: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl },
        modalCancelBtn: {
            flex: 1, padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
            borderWidth: 1, borderColor: theme.colors.surfaceBorder, alignItems: 'center',
        },
        modalCancelText: { color: theme.colors.textSecondary, fontWeight: '700' },
        modalSaveBtn: { flex: 1, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center' },
        modalSaveText: { color: '#FFF', fontWeight: '800' },
    });
}

interface Props {
    navigation: any;
    route: any;
}

export default function SavedListsScreen({ navigation, route }: Props) {
    const { t } = useTranslation();
    const { isPro } = usePro();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const LIST_TYPE_COLORS = useMemo(() => getListTypeColors(theme), [theme]);
    const pickMode = route.params?.pickMode as boolean | undefined;
    const [lists, setLists] = useState<SavedList[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [proGateVisible, setProGateVisible] = useState(false);
    const [editTarget, setEditTarget] = useState<SavedList | null>(null);
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<ListType>('general');
    const [formItems, setFormItems] = useState('');

    useFocusEffect(
        useCallback(() => {
            SavedListsStorage.getAll().then(setLists);
        }, [])
    );

    const openCreateModal = () => {
        if (!isPro && lists.length >= FREE_LIST_LIMIT) {
            setProGateVisible(true);
            return;
        }
        setEditTarget(null);
        setFormName('');
        setFormType('general');
        setFormItems('');
        setModalVisible(true);
    };

    const openEditModal = (list: SavedList) => {
        setEditTarget(list);
        setFormName(list.name);
        setFormType(list.type);
        setFormItems(list.items.join('\n'));
        setModalVisible(true);
    };

    const handleSave = async () => {
        const name = formName.trim();
        if (!name) return;
        let items = formItems.split('\n').map(s => s.trim()).filter(Boolean);
        if (items.length === 0) return;

        // Enforce item limit for free users
        if (!isPro && items.length > FREE_ITEM_LIMIT) {
            items = items.slice(0, FREE_ITEM_LIMIT);
            Alert.alert(
                t('pro.limit_title'),
                t('pro.item_limit_msg', { limit: FREE_ITEM_LIMIT })
            );
        }

        if (editTarget) {
            await SavedListsStorage.update(editTarget.id, { name, type: formType, items });
        } else {
            await SavedListsStorage.save({ name, type: formType, items });
        }
        const updated = await SavedListsStorage.getAll();
        setLists(updated);
        setModalVisible(false);
    };

    const handleDelete = (list: SavedList) => {
        Alert.alert(
            t('lists.delete_title', 'Listeyi Sil'),
            t('lists.delete_msg', '{{name}} silinecek.', { name: list.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('lists.delete_confirm', 'Sil'),
                    style: 'destructive',
                    onPress: async () => {
                        await SavedListsStorage.remove(list.id);
                        setLists(prev => prev.filter(l => l.id !== list.id));
                    },
                },
            ]
        );
    };

    const handlePick = (list: SavedList) => {
        if (pickMode) {
            navigation.navigate(route.params.returnScreen, { pickedList: list });
        }
    };

    const typeOptions: ListType[] = ['general', 'wheel', 'movie', 'order'];

    const renderItem = ({ item, index }: { item: SavedList; index: number }) => {
        const color = LIST_TYPE_COLORS[item.type];
        const icon = LIST_TYPE_ICONS[item.type];
        return (
            <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 250, delay: index * 40 }}
            >
                <GlassCard style={styles.listCard}>
                    <TouchableOpacity
                        style={styles.listCardInner}
                        onPress={() => pickMode ? handlePick(item) : openEditModal(item)}
                        accessibilityRole="button"
                    >
                        <View style={[styles.typeIcon, { backgroundColor: `${color}22` }]}>
                            <Ionicons name={icon as any} size={22} color={color} />
                        </View>
                        <View style={styles.listInfo}>
                            <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.listMeta}>
                                {item.items.length} {t('lists.items', 'öğe')}
                                {item.items.length > 0 && ` · ${item.items.slice(0, 2).join(', ')}${item.items.length > 2 ? '…' : ''}`}
                            </Text>
                        </View>
                        {pickMode ? (
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                        ) : (
                            <View style={styles.actionBtns}>
                                <TouchableOpacity
                                    onPress={() => openEditModal(item)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('lists.edit', 'Düzenle')}
                                >
                                    <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDelete(item)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('lists.delete_confirm', 'Sil')}
                                >
                                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                </GlassCard>
            </MotiView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.back', 'Geri')}
                >
                    <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>{t('lists.title', 'Kayıtlı Listeler')}</Text>
                    {pickMode && (
                        <Text style={styles.subtitle}>{t('lists.pick_hint', 'Kullanmak için seç')}</Text>
                    )}
                    {!isPro && !pickMode && (
                        <Text style={styles.limitBadge}>
                            {lists.length}/{FREE_LIST_LIMIT} {t('pro.free_tier')}
                        </Text>
                    )}
                </View>
                {!pickMode && (
                    <TouchableOpacity
                        onPress={openCreateModal}
                        style={styles.addHeaderBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('lists.create', 'Liste Oluştur')}
                    >
                        <Ionicons name="add" size={26} color={theme.colors.primary} />
                    </TouchableOpacity>
                )}
                {pickMode && <View style={{ width: 44 }} />}
            </View>

            {lists.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="bookmark-outline" size={72} color={theme.colors.surfaceBorder} />
                    <Text style={styles.emptyTitle}>{t('lists.empty_title', 'Henüz liste yok')}</Text>
                    <Text style={styles.emptySubtitle}>{t('lists.empty_hint', '"+" ile yeni liste oluştur')}</Text>
                    <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.createBtnText}>{t('lists.create', 'Liste Oluştur')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={lists}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {lists.length > 0 && !pickMode && (
                <View style={styles.fab}>
                    <TouchableOpacity
                        style={styles.fabBtn}
                        onPress={openCreateModal}
                        accessibilityRole="button"
                        accessibilityLabel={t('lists.create', 'Liste Oluştur')}
                    >
                        <Ionicons name="add" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            <ProGateModal
                visible={proGateVisible}
                onClose={() => setProGateVisible(false)}
                featureKey="unlimited_lists"
            />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>
                            {editTarget ? t('lists.edit', 'Düzenle') : t('lists.create', 'Yeni Liste')}
                        </Text>

                        <Text style={styles.fieldLabel}>{t('lists.name_label', 'Liste adı')}</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={formName}
                            onChangeText={setFormName}
                            placeholder={t('lists.name_placeholder', 'Örn: Film Gecesi')}
                            placeholderTextColor={theme.colors.textSecondary}
                        />

                        <Text style={styles.fieldLabel}>{t('lists.type_label', 'Tür')}</Text>
                        <View style={styles.typeRow}>
                            {typeOptions.map(tp => (
                                <TouchableOpacity
                                    key={tp}
                                    style={[styles.typeChip, formType === tp && { backgroundColor: LIST_TYPE_COLORS[tp] }]}
                                    onPress={() => setFormType(tp)}
                                >
                                    <Ionicons
                                        name={LIST_TYPE_ICONS[tp] as any}
                                        size={14}
                                        color={formType === tp ? '#FFF' : theme.colors.textSecondary}
                                    />
                                    <Text style={[styles.typeChipText, formType === tp && { color: '#FFF' }]}>
                                        {t(`lists.types.${tp}`, tp)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>{t('lists.items_label', 'Öğeler (her satıra bir tane)')}</Text>
                        <TextInput
                            style={[styles.modalInput, styles.modalTextArea]}
                            value={formItems}
                            onChangeText={setFormItems}
                            placeholder={t('lists.items_placeholder', 'Örn:\nDomino\'s\nPaperMoon\nÇiya')}
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave}>
                                <Text style={styles.modalSaveText}>{t('lists.save', 'Kaydet')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

