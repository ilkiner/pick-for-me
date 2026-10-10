// Supabase Edge Function: delete-account
//
// Kimliği doğrulanmış kullanıcının hesabını ve verisini siler (Google Play hesap
// silme zorunluluğu). Sıra:
//   1. Çağıranın JWT'sini doğrula (gateway'de verify_jwt + burada getUser).
//   2. saved_lists + activity_history satırlarını sil (ON DELETE CASCADE de var;
//      açıkça silmek, FK'sız bir tablo eklenirse bile veri bırakmamayı garantiler).
//   3. RevenueCat müşteri kaydını sil (DELETE /v1/subscribers/{app_user_id}).
//      Uygulama RevenueCat'e Supabase kullanıcı id'siyle giriş yapıyor
//      (ProContext → Purchases.logIn(user.id)), yani app_user_id = user.id.
//   4. Auth kullanıcısını service-role ile sil.
//
// RevenueCat adımı silmeyi ENGELLEMEZ: anahtar yoksa ya da RevenueCat hata
// verirse uyarı loglanır, yanıtta revenuecatDeleted: false döner, ama veri ve
// auth kaydı yine silinir — kullanıcının hesabını silememesi daha kötü sonuç.
// RevenueCat kaydında kişisel veri yok (anonim id + satın alma makbuzları);
// gerekirse panelden elle silinebilir.
//
// Gizli anahtarlar: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// Edge ortamında hazır gelir. REVENUECAT_SECRET_KEY Edge Function secret'ı olarak
// eklenir; asla uygulamaya ya da repoya yazılmaz.
//
// Deploy: npx supabase functions deploy delete-account (verify_jwt açık)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

type RevenueCatStatus = 'deleted' | 'not_found' | 'skipped_no_secret' | 'failed';

async function deleteRevenueCatSubscriber(appUserId: string): Promise<{ status: RevenueCatStatus; detail?: string }> {
    const secret = Deno.env.get('REVENUECAT_SECRET_KEY');
    if (!secret) {
        console.warn('[delete-account] REVENUECAT_SECRET_KEY is not set — skipping RevenueCat deletion');
        return { status: 'skipped_no_secret' };
    }
    try {
        const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) return { status: 'deleted' };
        // Hiç RevenueCat'e giriş yapmamış (ör. web'den kayıt olup uygulamayı açmamış) kullanıcı.
        if (res.status === 404) return { status: 'not_found' };
        const text = (await res.text()).slice(0, 300);
        console.warn(`[delete-account] RevenueCat DELETE failed: ${res.status} ${text}`);
        return { status: 'failed', detail: `HTTP ${res.status}` };
    } catch (e) {
        console.warn('[delete-account] RevenueCat request error:', e);
        return { status: 'failed', detail: 'network error' };
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing_authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Çağıranı doğrula
    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'invalid_or_expired_token' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 2) Uygulama verisi
    const { count: listsDeleted, error: listsError } = await admin
        .from('saved_lists').delete({ count: 'exact' }).eq('user_id', user.id);
    if (listsError) return json({ error: 'delete_saved_lists_failed', detail: listsError.message }, 500);

    const { count: historyDeleted, error: historyError } = await admin
        .from('activity_history').delete({ count: 'exact' }).eq('user_id', user.id);
    if (historyError) return json({ error: 'delete_activity_history_failed', detail: historyError.message }, 500);

    // 3) RevenueCat — başarısız olsa bile silme devam eder
    const revenuecat = await deleteRevenueCatSubscriber(user.id);
    const revenuecatDeleted = revenuecat.status === 'deleted' || revenuecat.status === 'not_found';

    // 4) Auth kullanıcısı
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
        return json({
            error: 'delete_auth_user_failed',
            detail: deleteError.message,
            listsDeleted, historyDeleted, revenuecatDeleted, revenuecatStatus: revenuecat.status,
        }, 500);
    }

    return json({
        success: true,
        listsDeleted: listsDeleted ?? 0,
        historyDeleted: historyDeleted ?? 0,
        revenuecatDeleted,
        revenuecatStatus: revenuecat.status,
        ...(revenuecat.detail ? { revenuecatDetail: revenuecat.detail } : {}),
    });
});
