import * as Sentry from '@sentry/react-native';
import { isSupabaseConfigured, supabase } from './supabase';
import { SavedList } from './savedLists';
import { ClearHistoryResult, HistoryItem } from './history';

/**
 * Bir senkronizasyon denemesinin sonucu.
 *  - 'synced'     : buluta yazıldı
 *  - 'local_only' : Supabase yapılandırılmamış ya da oturum yok — normal durum,
 *                   kullanıcıyı rahatsız etme
 *  - 'failed'     : gerçek hata (ağ ya da sunucu reddi) — kullanıcıya söyle
 *
 * Eskiden hepsi `console.warn` ile yutuluyordu: kullanıcı listesinin buluta
 * gitmediğini hiç öğrenmiyordu, biz de üretimde göremiyorduk.
 */
export type SyncOutcome = 'synced' | 'local_only' | 'failed';

function reportSyncFailure(operation: string, error: unknown): 'failed' {
    const message = error instanceof Error ? error.message : String((error as any)?.message ?? error);
    console.warn(`[Sync] ${operation} failed:`, message);
    try {
        Sentry.captureException(
            error instanceof Error ? error : new Error(`[Sync] ${operation}: ${message}`),
            { level: 'warning', tags: { area: 'sync', sync_operation: operation } },
        );
    } catch {
        // Sentry yoksa sessiz geç
    }
    return 'failed';
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function hasCloudSession(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch {
        return false;
    }
}

// ─── Saved Lists Sync ─────────────────────────────────────────────────────────

export async function pushListsToCloud(lists: SavedList[]): Promise<SyncOutcome> {
    if (!isSupabaseConfigured()) return 'local_only';
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return 'local_only';

        const userId = session.user.id;
        const rows = lists.map(l => ({
            id: l.id,
            user_id: userId,
            name: l.name,
            type: l.type,
            items: l.items,
            created_at: l.createdAt,
            updated_at: l.createdAt,
        }));

        const { error } = await supabase
            .from('saved_lists')
            .upsert(rows, { onConflict: 'id' });

        if (error) return reportSyncFailure('pushLists', error);
        return 'synced';
    } catch (e) {
        return reportSyncFailure('pushLists', e);
    }
}

export async function pullListsFromCloud(): Promise<SavedList[] | null> {
    if (!isSupabaseConfigured()) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
        .from('saved_lists')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        reportSyncFailure('pullLists', error);
        return null;
    }

    return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        items: Array.isArray(row.items) ? row.items : [],
        createdAt: row.created_at,
    }));
}

export async function deleteListFromCloud(id: string): Promise<SyncOutcome> {
    if (!isSupabaseConfigured()) return 'local_only';
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return 'local_only';

        const { error } = await supabase
            .from('saved_lists')
            .delete()
            .eq('id', id);

        if (error) return reportSyncFailure('deleteList', error);
        return 'synced';
    } catch (e) {
        return reportSyncFailure('deleteList', e);
    }
}

// ─── Activity History Sync ────────────────────────────────────────────────────

export async function pushHistoryItemToCloud(item: HistoryItem): Promise<SyncOutcome> {
    if (!isSupabaseConfigured()) return 'local_only';
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return 'local_only';

        const { error } = await supabase.from('activity_history').upsert({
            id: item.id,
            user_id: session.user.id,
            type: item.type,
            result: item.result,
            timestamp: item.timestamp,
        }, { onConflict: 'id' });

        if (error) return reportSyncFailure('pushHistory', error);
        return 'synced';
    } catch (e) {
        return reportSyncFailure('pushHistory', e);
    }
}

export async function pullHistoryFromCloud(retentionMs: number = 48 * 60 * 60 * 1000): Promise<HistoryItem[] | null> {
    if (!isSupabaseConfigured()) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Pull window matches the caller's retention (48 h free / 10 days pro)
    const since = Date.now() - retentionMs;

    const { data, error } = await supabase
        .from('activity_history')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(500);

    if (error) {
        reportSyncFailure('pullHistory', error);
        return null;
    }

    return (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        result: row.result,
        timestamp: row.timestamp,
    }));
}

export async function clearHistoryInCloud(): Promise<ClearHistoryResult> {
    if (!isSupabaseConfigured()) return 'local_only';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return 'local_only';

        // RLS kullanıcıyı zaten kendi satırlarıyla sınırlıyor; user_id filtresi
        // niyeti açık bırakmak için, accountDeletion ile aynı desende.
        const { error } = await supabase
            .from('activity_history')
            .delete()
            .eq('user_id', session.user.id);

        if (error) throw error;
        return 'cleared';
    } catch (e) {
        reportSyncFailure('clearHistory', e);
        return 'cloud_failed';
    }
}

// Merge strategy: cloud wins for lists (authoritative), local wins for history
// (we append local items that aren't in cloud yet)
export async function mergeListsWithCloud(local: SavedList[]): Promise<SavedList[]> {
    const cloud = await pullListsFromCloud();
    if (!cloud) return local;

    const cloudIds = new Set(cloud.map(l => l.id));
    const localOnly = local.filter(l => !cloudIds.has(l.id));

    if (localOnly.length > 0) {
        await pushListsToCloud(localOnly);
    }

    return cloud;
}
