import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedListsStorage } from './savedLists';
import { HistoryStorage } from './history';
import { pullListsFromCloud, pushListsToCloud, pushHistoryItemsToCloud } from './syncService';
import { supabase } from './supabase';
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

// Oturum kuşağı: her çıkış (ve her SIGNED_OUT) bunu artırır. Sürmekte olan bir
// birleştirme, cihaza bir şey yazmadan önce kuşağın değişmediğini kontrol eder.
// Ağ isteği iptal edilemiyor ama SONUCU yok sayılabiliyor; önemli olan da bu:
// çıkıştan sonra hesabın listeleri ya da "birleştirildi" işareti cihaza geri
// yazılmamalı (sonraki hesap o listeleri kendi buluta yükler, işaret de aynı
// hesapla dönüşte misafir geçmişinin taşınmasını engeller).
let generation = 0;

let running: { gen: number; promise: Promise<void> } | null = null;

export function syncLocalDataToAccount(userId: string): Promise<void> {
    // SIGNED_IN ve INITIAL_SESSION arka arkaya gelirse ikinci bir tur başlatma —
    // ama iptal edilmiş eski bir tur, yeni girişin turunu engellememeli.
    if (running && running.gen === generation) return running.promise;

    const gen = generation;
    const cancelled = () => gen !== generation;

    const promise = (async () => {
        await SavedListsStorage.syncWithCloud(cancelled);
        if (cancelled()) return;

        try {
            const done = await AsyncStorage.getItem(HISTORY_SYNCED_KEY);
            if (done !== userId) {
                const outcome = await HistoryStorage.syncWithCloud();
                if (outcome === 'synced' && !cancelled()) {
                    await AsyncStorage.setItem(HISTORY_SYNCED_KEY, userId);
                }
            }
        } catch (e) {
            console.warn('[Sync] history merge failed:', e);
        }
    })().finally(() => {
        if (running?.promise === promise) running = null;
    });

    running = { gen, promise };
    return promise;
}

/** Sürmekte olan birleştirmenin sonucunu geçersiz kılar (bkz. generation). */
export function cancelAccountSync(): void {
    generation++;
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

export type SignOutResult = 'signed_out' | 'failed';

// Supabase'den çık; yalnızca çıkış gerçekten olduysa yerel veriyi temizle.
//
// Başarısızlık ('failed') çağırana bildirilir ve HİÇBİR ŞEY değişmez: oturum
// açık kalır, cihazdaki veri silinmez. Çevrimdışıyken yerel bir çıkış
// (oturumu cihazdan silip veriyi temizlemek) bilerek yapılmıyor:
//  - supabase-js ağsız çıkış yapmıyor (sunucu hatasında oturumu bırakmıyor);
//    elle silmek, sunucuda geçerli bir refresh token bırakırdı.
//  - Bu yola zaten genelde "buluta gitmemiş veri var" uyarısından geliniyor;
//    temizlemek o veriyi kalıcı olarak yok ederdi. Beklemek ise hiçbir şey
//    kaybettirmiyor — bağlantı gelince çıkış tek dokunuşla tamamlanır.
export async function signOutAndClearLocal(): Promise<SignOutResult> {
    // Çıkış başladı: sürmekte olan giriş birleştirmesi artık cihaza yazmasın.
    // Çıkış başarısız olursa birleştirme bir sonraki açılışta (INITIAL_SESSION)
    // yeniden çalışır; veri kaybı yok.
    cancelAccountSync();

    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn('[Auth] sign out failed:', error?.message ?? error);
            return 'failed';
        }
    } catch (e) {
        console.warn('[Auth] sign out failed:', e);
        return 'failed';
    }

    await clearLocalAccountData();
    return 'signed_out';
}

// SIGNED_OUT olayında da çağrılır (oturum süresi dolması, hesap silme): sürmekte
// olan birleştirmeyi geçersiz kılar ve "geçmiş birleştirildi" işaretini siler.
export async function resetAccountSyncState(): Promise<void> {
    cancelAccountSync();
    await AsyncStorage.removeItem(HISTORY_SYNCED_KEY).catch(() => {});
}
