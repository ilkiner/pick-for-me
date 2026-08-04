import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearHistoryInCloud, hasCloudSession, pushHistoryItemToCloud } from './syncService';
import { HISTORY_MAX_ITEMS } from '../store/ProContext';

export interface HistoryItem {
    id: string;
    type: string;
    result: any;
    timestamp: number;
}

const KEY = '@app_history';

// 'local_only'   → oturum yok / demo mod; silinecek bulut verisi yoktu
// 'cleared'      → hem cihazdan hem buluttan silindi
// 'cloud_failed' → cihazdan silindi, bulut satırları duruyor
export type ClearHistoryResult = 'local_only' | 'cleared' | 'cloud_failed';

export const HistoryStorage = {
    // Geçmişin buluta da yazılıp yazılmadığı — onay metnini seçmek için.
    async isSynced(): Promise<boolean> {
        return hasCloudSession();
    },

    // Tüm araçların geçmişe yazdığı tek nokta: yerele yaz, sınırı uygula,
    // sonra buluta gönder. Bulut push'u fire-and-forget — oturum yoksa
    // pushHistoryItemToCloud zaten sessizce çıkıyor.
    async add(type: string, result: any): Promise<HistoryItem | null> {
        const item: HistoryItem = {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
            type: type || 'unknown',
            result,
            timestamp: Date.now(),
        };

        try {
            const stored = await AsyncStorage.getItem(KEY);
            let parsed: HistoryItem[] = stored ? JSON.parse(stored) : [];
            parsed.push(item);

            // Safety cap: keep newest items only
            if (parsed.length > HISTORY_MAX_ITEMS) {
                parsed = parsed.slice(parsed.length - HISTORY_MAX_ITEMS);
            }

            await AsyncStorage.setItem(KEY, JSON.stringify(parsed));
        } catch (e) {
            console.error('Failed to save history', e);
            return null;
        }

        pushHistoryItemToCloud(item).catch(() => {});
        return item;
    },

    // Saklama penceresi dışında kalanları budar, kalanları yeniden eskiye
    // sıralı döner. Budama bir şey çıkardıysa diske geri yazar.
    async load(retentionMs: number): Promise<HistoryItem[]> {
        try {
            const stored = await AsyncStorage.getItem(KEY);
            if (!stored) return [];

            const parsed: HistoryItem[] = JSON.parse(stored);
            const cutoff = Date.now() - retentionMs;

            let kept = parsed.filter(item => item.timestamp > cutoff);
            kept.sort((a, b) => b.timestamp - a.timestamp);
            kept = kept.slice(0, HISTORY_MAX_ITEMS);

            if (kept.length !== parsed.length) {
                await AsyncStorage.setItem(KEY, JSON.stringify(kept));
            }

            return kept;
        } catch (e) {
            console.error('Failed to load history', e);
            return [];
        }
    },

    async clear(): Promise<ClearHistoryResult> {
        // Önce bulut denenir, sonuç ne olursa olsun yerel geçmiş silinir:
        // bulut hatası kullanıcının cihazındaki veriyi temizlemesini engellememeli.
        const cloud = await clearHistoryInCloud();
        await AsyncStorage.removeItem(KEY);
        return cloud;
    },
};
