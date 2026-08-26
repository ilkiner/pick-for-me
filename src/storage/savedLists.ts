import { LocalStorage } from './local';
import {
    pushListsToCloud, pullListsFromCloud, deleteListFromCloud, mergeListsWithCloud,
    SyncOutcome,
} from './syncService';

export type ListType = 'wheel' | 'movie' | 'order' | 'general';

// saved_lists.name üzerindeki DB kısıtıyla aynı: CHECK (char_length BETWEEN 1 AND 100).
// İstemcide de sınırlamak, kullanıcının sunucu reddine hiç düşmemesini sağlıyor.
export const LIST_NAME_MAX_LENGTH = 100;

export interface SavedList {
    id: string;
    name: string;
    type: ListType;
    items: string[];
    createdAt: number;
}

const KEY = '@saved_lists';

export const SavedListsStorage = {
    async getAll(): Promise<SavedList[]> {
        return (await LocalStorage.getItem<SavedList[]>(KEY)) ?? [];
    },

    // Not: yerel kayıt her zaman başarılı sayılır; dönen sonuç YALNIZCA bulut
    // senkronizasyonunu anlatır. Çağıran taraf 'failed' durumunda kullanıcıyı
    // uyarmalı — veri cihazda duruyor ama buluta gitmedi.
    async save(list: Omit<SavedList, 'id' | 'createdAt'>): Promise<{ list: SavedList; sync: SyncOutcome }> {
        const all = await this.getAll();
        const newList: SavedList = {
            ...list,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            createdAt: Date.now(),
        };
        const updated = [...all, newList];
        await LocalStorage.setItem(KEY, updated);
        const sync = await pushListsToCloud([newList]).catch(() => 'failed' as SyncOutcome);
        return { list: newList, sync };
    },

    async update(id: string, patch: Partial<Pick<SavedList, 'name' | 'items' | 'type'>>): Promise<SyncOutcome> {
        const all = await this.getAll();
        const updated = all.map(l => (l.id === id ? { ...l, ...patch } : l));
        await LocalStorage.setItem(KEY, updated);
        const patched = updated.find(l => l.id === id);
        if (!patched) return 'local_only';
        return pushListsToCloud([patched]).catch(() => 'failed' as SyncOutcome);
    },

    async remove(id: string): Promise<SyncOutcome> {
        const all = await this.getAll();
        await LocalStorage.setItem(KEY, all.filter(l => l.id !== id));
        return deleteListFromCloud(id).catch(() => 'failed' as SyncOutcome);
    },

    // Call on app start (after auth) to merge local ↔ cloud
    async syncWithCloud(): Promise<void> {
        try {
            const local = await this.getAll();
            const merged = await mergeListsWithCloud(local);
            await LocalStorage.setItem(KEY, merged);
        } catch (e) {
            console.warn('[Sync] syncWithCloud failed:', e);
        }
    },

    // Replace local with cloud (e.g., on sign-in on a new device)
    async pullFromCloud(): Promise<void> {
        try {
            const cloud = await pullListsFromCloud();
            if (cloud) await LocalStorage.setItem(KEY, cloud);
        } catch (e) {
            console.warn('[Sync] pullFromCloud failed:', e);
        }
    },
};
