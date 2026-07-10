// Supabase Edge Function: delete-account
//
// Kimliği doğrulanmış kullanıcının auth kaydını (ve ON DELETE CASCADE ile
// kalan tüm verilerini) siler. Client'tan gelen JWT ile kullanıcı doğrulanır;
// silme işlemi service-role anahtarıyla yapılır (bu anahtar asla uygulamaya
// gömülmez, yalnızca Edge Function ortamında bulunur).
//
// Deploy: npx supabase functions deploy delete-account  (bkz. README)

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

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return json({ error: 'Missing Authorization header' }, 401);
    }

    // SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
    // Edge Function çalışma ortamında otomatik olarak tanımlıdır.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) İsteği yapan kullanıcıyı JWT ile doğrula
    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
        return json({ error: 'Invalid or expired token' }, 401);
    }

    // 2) Service-role ile sil. Önce tablo verileri (CASCADE zaten siler ama
    // açıkça silmek, FK'sız tablo eklenirse bile veri bırakmamayı garantiler).
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: listsError } = await adminClient
        .from('saved_lists').delete().eq('user_id', user.id);
    if (listsError) {
        return json({ error: `Failed to delete saved_lists: ${listsError.message}` }, 500);
    }

    const { error: historyError } = await adminClient
        .from('activity_history').delete().eq('user_id', user.id);
    if (historyError) {
        return json({ error: `Failed to delete activity_history: ${historyError.message}` }, 500);
    }

    // 3) Auth kullanıcısını sil
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
        return json({ error: `Failed to delete user: ${deleteError.message}` }, 500);
    }

    return json({ success: true });
});
