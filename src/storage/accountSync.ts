import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedListsStorage } from './savedLists';
import { HistoryStorage } from './history';
import { pullListsFromCloud, pushListsToCloud, pushHistoryItemsToCloud } from './syncService';
import { HISTORY_RETENTION_PRO_MS } from '../store/ProContext';

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

// Çıkıştan ÖNCE: cihazdaki her şey bulutta mı? Çıkışta yerel kopya silineceği için
// buluta hiç gitmemiş bir liste/kayıt (çevrimdışı oluşturulmuş, push'u başarısız
// olmuş) kalıcı olarak kaybolurdu. Bulutta olmayanları yükler; hepsi bulutta
// (ya da yeni yüklendi) ise true, doğrulanamadıysa false döner.
export async function flushLocalDataToCloud(): Promise<boolean> {
    try {
        const lists = await SavedListsStorage.getAll();
        if (lists.length > 0) {
            const cloud = await pullListsFromCloud();
            if (!cloud) return false;
            const cloudIds = new Set(cloud.map(l => l.id));
            const pending = lists.filter(l => !cloudIds.has(l.id));
            if (pending.length > 0 && (await pushListsToCloud(pending)) !== 'synced') return false;
        }

        const history = await HistoryStorage.load(HISTORY_RETENTION_PRO_MS);
        if (history.length > 0 && (await pushHistoryItemsToCloud(history)) !== 'synced') return false;

        return true;
    } catch {
        return false;
    }
}

// Çıkışta cihazı boş misafir durumuna döndürür: kayıtlı listeler ve geçmiş silinir.
// Bulut kopyasına DOKUNMAZ — aynı hesapla girince geri gelir. Ayarlar, tema,
// dil ve onboarding durumu bilerek korunur (anahtarları burada hiç yok).
export async function clearLocalAccountData(): Promise<void> {
    await Promise.all([
        SavedListsStorage.clearLocal(),
        HistoryStorage.clearLocal(),
        resetAccountSyncState(),
    ]).catch(e => console.warn('[Sync] local clear failed:', e));
}

export async function resetAccountSyncState(): Promise<void> {
    await AsyncStorage.removeItem(HISTORY_SYNCED_KEY).catch(() => {});
}
