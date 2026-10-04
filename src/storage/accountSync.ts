import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedListsStorage } from './savedLists';
import { HistoryStorage } from './history';

// Cihazdaki verinin (misafirken ya da çevrimdışıyken biriken) hesaba taşınması.
//
// Kural: HİÇBİR YÖNDE ÜZERİNE YAZMA.
//  - Listeler: bulutta olan bulut kopyasıyla kalır, yalnızca cihazda olanlar
//    buluta eklenir ve cihazda da tutulur (bkz. mergeListsWithCloud).
//  - Geçmiş: yalnızca yukarı yönlü, çakışan satırlar atlanır.

// Geçmiş yüklemesi hesap başına bir kez başarıyla yapıldıysa tekrarlanmaz —
// sonraki kayıtlar zaten tek tek buluta gidiyor. Çıkışta silinir: aynı hesapla
// geri dönen kullanıcının misafirken biriktirdikleri de yeniden taşınmalı.
const HISTORY_SYNCED_KEY = '@history_synced_user';

let running: Promise<void> | null = null;

export function syncLocalDataToAccount(userId: string): Promise<void> {
    // SIGNED_IN ve INITIAL_SESSION arka arkaya gelirse ikinci bir tur başlatma.
    if (running) return running;

    running = (async () => {
        await SavedListsStorage.syncWithCloud();

        try {
            const done = await AsyncStorage.getItem(HISTORY_SYNCED_KEY);
            if (done !== userId) {
                const outcome = await HistoryStorage.syncWithCloud();
                if (outcome === 'synced') {
                    await AsyncStorage.setItem(HISTORY_SYNCED_KEY, userId);
                }
            }
        } catch (e) {
            console.warn('[Sync] history merge failed:', e);
        }
    })().finally(() => { running = null; });

    return running;
}

export async function resetAccountSyncState(): Promise<void> {
    await AsyncStorage.removeItem(HISTORY_SYNCED_KEY).catch(() => {});
}
