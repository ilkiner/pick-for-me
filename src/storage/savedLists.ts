import { LocalStorage } from './local';
import { pushListsToCloud, pullListsFromCloud, deleteListFromCloud, mergeListsWithCloud } from './syncService';

export type ListType = 'wheel' | 'movie' | 'order' | 'general';

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

    async save(list: Omit<SavedList, 'id' | 'createdAt'>): Promise<SavedList> {
        const all = await this.getAll();
        const newList: SavedList = {
            ...list,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            createdAt: Date.now(),
        };
        const updated = [...all, newList];
        await LocalStorage.setItem(KEY, updated);
        pushListsToCloud([newList]).catch(() => {});
        return newList;
    },

    async update(id: string, patch: Partial<Pick<SavedList, 'name' | 'items' | 'type'>>): Promise<void> {
        const all = await this.getAll();
        const updated = all.map(l => (l.id === id ? { ...l, ...patch } : l));
        await LocalStorage.setItem(KEY, updated);
        const patched = updated.find(l => l.id === id);
        if (patched) pushListsToCloud([patched]).catch(() => {});
    },

    async remove(id: string): Promise<void> {
        const all = await this.getAll();
        await LocalStorage.setItem(KEY, all.filter(l => l.id !== id));
        deleteListFromCloud(id).catch(() => {});
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
