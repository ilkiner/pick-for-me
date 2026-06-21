import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_KEY = '@pickforme:recentTools';
const FAV_KEY = '@pickforme:favoriteTools';

export async function trackToolVisit(toolId: string): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(RECENT_KEY);
        let ids: string[] = raw ? JSON.parse(raw) : [];
        ids = [toolId, ...ids.filter(id => id !== toolId)].slice(0, 4);
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(ids));
    } catch {}
}

export async function getRecentToolIds(): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(RECENT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function toggleFavoriteTool(toolId: string): Promise<boolean> {
    try {
        const raw = await AsyncStorage.getItem(FAV_KEY);
        const ids: string[] = raw ? JSON.parse(raw) : [];
        const isFav = ids.includes(toolId);
        const next = isFav ? ids.filter(id => id !== toolId) : [...ids, toolId];
        await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
        return !isFav;
    } catch {
        return false;
    }
}

export async function getFavoriteToolIds(): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(FAV_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}
