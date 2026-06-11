import { isSupabaseConfigured, supabase } from './supabase';
import { SavedList } from './savedLists';

export interface HistoryItem {
    id: string;
    type: string;
    result: any;
    timestamp: number;
}

// ─── Saved Lists Sync ─────────────────────────────────────────────────────────

export async function pushListsToCloud(lists: SavedList[]): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

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

    if (error) console.warn('[Sync] pushLists error:', error.message);
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
        console.warn('[Sync] pullLists error:', error.message);
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

export async function deleteListFromCloud(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
        .from('saved_lists')
        .delete()
        .eq('id', id);

    if (error) console.warn('[Sync] deleteList error:', error.message);
}

// ─── Activity History Sync ────────────────────────────────────────────────────

export async function pushHistoryItemToCloud(item: HistoryItem): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('activity_history').upsert({
        id: item.id,
        user_id: session.user.id,
        type: item.type,
        result: item.result,
        timestamp: item.timestamp,
    }, { onConflict: 'id' });

    if (error) console.warn('[Sync] pushHistory error:', error.message);
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
        console.warn('[Sync] pullHistory error:', error.message);
        return null;
    }

    return (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        result: row.result,
        timestamp: row.timestamp,
    }));
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
