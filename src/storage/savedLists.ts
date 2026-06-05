import { LocalStorage } from './local';

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
        await LocalStorage.setItem(KEY, [...all, newList]);
        return newList;
    },

    async update(id: string, patch: Partial<Pick<SavedList, 'name' | 'items' | 'type'>>): Promise<void> {
        const all = await this.getAll();
        const updated = all.map(l => (l.id === id ? { ...l, ...patch } : l));
        await LocalStorage.setItem(KEY, updated);
    },

    async remove(id: string): Promise<void> {
        const all = await this.getAll();
        await LocalStorage.setItem(KEY, all.filter(l => l.id !== id));
    },
};
