import { isSupabaseConfigured, supabase } from './supabase';

// Hesap silme akışı (Google Play zorunluluğu):
// 1. Kullanıcının bulut verilerini sil (saved_lists + activity_history).
// 2. Auth kullanıcısını silmek için 'delete-account' Edge Function'ını çağır
//    (client anon key ile auth.users silemez; service-role sunucuda kalmalı).
// 3. Edge Function erişilemezse fallback: veriler zaten silindi → oturumu
//    kapat ve "talep alındı" olarak raporla (auth kaydı manuel/sonradan silinir).
export type DeleteAccountResult = 'deleted' | 'requested' | 'no_session' | 'error';

export async function deleteAccount(): Promise<DeleteAccountResult> {
    if (!isSupabaseConfigured()) return 'no_session';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'no_session';

    const userId = session.user.id;

    // 1) Bulut verilerini sil. RLS delete politikaları kullanıcıya kendi
    // satırlarını silme izni veriyor. Hata olursa akışı durdur — kullanıcıya
    // "verilerin silindi" demeden önce gerçekten silinmiş olmalı.
    try {
        const { error: listsError } = await supabase
            .from('saved_lists')
            .delete()
            .eq('user_id', userId);
        if (listsError) throw listsError;

        const { error: historyError } = await supabase
            .from('activity_history')
            .delete()
            .eq('user_id', userId);
        if (historyError) throw historyError;
    } catch (e) {
        console.warn('[AccountDeletion] data delete failed:', e);
        return 'error';
    }

    // 2) Auth kullanıcısını Edge Function ile sil
    try {
        const { error } = await supabase.functions.invoke('delete-account', {
            method: 'POST',
        });
        if (error) throw error;

        // Kullanıcı sunucuda silindi; yereldeki oturum artıklarını temizle.
        // signOut hata verebilir (kullanıcı yok) — önemsiz.
        await supabase.auth.signOut().catch(() => {});
        return 'deleted';
    } catch (e) {
        console.warn('[AccountDeletion] edge function failed, falling back:', e);
        // 3) Fallback: veriler silindi ama auth kaydı duruyor →
        // oturumu kapat, "talep alındı" bildir.
        await supabase.auth.signOut().catch(() => {});
        return 'requested';
    }
}
