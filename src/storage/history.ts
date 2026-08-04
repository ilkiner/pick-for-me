import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearHistoryInCloud, hasCloudSession } from './syncService';

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

    async clear(): Promise<ClearHistoryResult> {
        // Önce bulut denenir, sonuç ne olursa olsun yerel geçmiş silinir:
        // bulut hatası kullanıcının cihazındaki veriyi temizlemesini engellememeli.
        const cloud = await clearHistoryInCloud();
        await AsyncStorage.removeItem(KEY);
        return cloud;
    },
};
