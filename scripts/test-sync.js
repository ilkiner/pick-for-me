#!/usr/bin/env node
// Senkron mantığı testleri: misafir → hesap birleştirme, çıkışta temizleme.
//
// Gerçek src/storage modüllerini (TypeScript, sucrase ile anında derlenir) bellek
// içi bir AsyncStorage ve sahte bir Supabase istemcisiyle çalıştırır. Sahte
// istemci RLS'yi (herkes yalnızca kendi satırını görür), ON CONFLICT DO NOTHING'i,
// ağ kesintisini ve gecikmeyi taklit eder; bir istek GÖNDERİLDİĞİ andaki oturumla
// yanıtlanır, tıpkı gerçek sunucu gibi.
//
//   npm run test:sync
//
// Cihaz ya da ağ gerektirmez. Çıkış kodu: hepsi geçtiyse 0, değilse 1.

require('sucrase/register/ts');
const Module = require('module');
const path = require('path');

// ─── Sahte bağımlılıklar ──────────────────────────────────────────────────────
const store = new Map();
const AsyncStorage = {
    getItem: async k => (store.has(k) ? store.get(k) : null),
    setItem: async (k, v) => { store.set(k, v); },
    removeItem: async k => { store.delete(k); },
};

const db = { saved_lists: new Map(), activity_history: new Map() };
const net = { offline: false, delay: 0, session: null, calls: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function builder(table) {
    const q = { table, op: 'select', filters: [], rows: null, opts: null };
    const b = {
        select() { q.op = 'select'; return b; },
        order() { return b; },
        limit() { return b; },
        gte(col, v) { q.filters.push(r => r[col] >= v); return b; },
        eq(col, v) { q.filters.push(r => r[col] === v); return b; },
        upsert(rows, opts) { q.op = 'upsert'; q.rows = Array.isArray(rows) ? rows : [rows]; q.opts = opts; return b; },
        delete() { q.op = 'delete'; return b; },
        then(res, rej) { return send(q).then(res, rej); },
    };
    return b;
}

async function send(q) {
    const uid = net.session?.user?.id; // istek, gönderildiği andaki token'ı taşır
    const offline = net.offline;
    net.calls.push(`${q.op}:${q.table}`);
    if (net.delay) await sleep(net.delay);
    if (offline) return { data: null, error: { message: 'Network request failed' } };
    const t = db[q.table];
    const mine = [...t.values()].filter(r => r.user_id === uid); // RLS
    if (q.op === 'select') return { data: mine.filter(r => q.filters.every(f => f(r))), error: null };
    if (q.op === 'delete') {
        for (const r of mine.filter(r => q.filters.every(f => f(r)))) t.delete(r.id);
        return { data: null, error: null };
    }
    for (const r of q.rows) {
        if (t.has(r.id) && q.opts?.ignoreDuplicates) continue; // ON CONFLICT DO NOTHING
        t.set(r.id, { ...r });
    }
    return { data: null, error: null };
}

const supabaseMock = {
    isSupabaseConfigured: () => true,
    supabase: {
        auth: {
            getSession: async () => ({ data: { session: net.session } }),
            // auth-js davranışı: ağ hatasında hata döner ve oturumu SİLMEZ.
            signOut: async () => {
                if (net.offline) return { error: { name: 'AuthRetryableFetchError', message: 'Network request failed', status: 0 } };
                net.session = null;
                return { error: null };
            },
        },
        from: builder,
    },
};
const proMock = {
    HISTORY_MAX_ITEMS: 500,
    HISTORY_RETENTION_PRO_MS: 10 * 24 * 3600 * 1000,
    HISTORY_RETENTION_FREE_MS: 48 * 3600 * 1000,
};

const fakes = {
    '@react-native-async-storage/async-storage': { __esModule: true, default: AsyncStorage },
    '@sentry/react-native': { captureException() {}, addBreadcrumb() {} },
    './supabase': supabaseMock,
    '../store/ProContext': proMock,
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
    return fakes[req] ? 'fake:' + req : origResolve.call(this, req, ...rest);
};
for (const [k, v] of Object.entries(fakes)) {
    const m = new Module('fake:' + k);
    m.exports = v;
    m.loaded = true;
    require.cache['fake:' + k] = m;
}

const src = path.join(__dirname, '..', 'src', 'storage');
const { SavedListsStorage } = require(path.join(src, 'savedLists.ts'));
const { HistoryStorage } = require(path.join(src, 'history.ts'));
const acct = require(path.join(src, 'accountSync.ts'));

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond, detail = '') {
    if (cond) { pass++; console.log('  PASS', name); }
    else { fail++; console.log('  FAIL', name, detail); }
}
const ids = a => a.map(x => x.id).sort().join(',');
const reset = () => {
    store.clear(); db.saved_lists.clear(); db.activity_history.clear();
    Object.assign(net, { offline: false, delay: 0, session: null, calls: [] });
};
const login = id => { net.session = { user: { id, email: id + '@test' } }; };
const seedCloudList = (uid, id, name) => db.saved_lists.set(id, {
    id, user_id: uid, name, type: 'general', items: ['x'], created_at: 1, updated_at: 1,
});
const cloudListIds = uid => [...db.saved_lists.values()].filter(r => r.user_id === uid).map(r => r.id).sort().join(',');
const cloudHistory = uid => [...db.activity_history.values()].filter(r => r.user_id === uid).length;
const localHistory = () => HistoryStorage.load(proMock.HISTORY_RETENTION_PRO_MS);

// Konsol gürültüsünü (beklenen ağ hatası uyarıları) test çıktısından ayır.
const quiet = fn => async () => {
    const w = console.warn, e = console.error;
    console.warn = console.error = () => {};
    try { await fn(); } finally { console.warn = w; console.error = e; }
};

const tests = [
    ['T1 misafir listesi + geçmişi ilk girişte birleşir (üzerine yazmadan)', async () => {
        reset();
        seedCloudList('U', 'cloudA', 'from other device');
        seedCloudList('U', 'shared', 'CLOUD VERSION');
        store.set('@saved_lists', JSON.stringify([
            { id: 'shared', name: 'LOCAL VERSION', type: 'general', items: ['y'], createdAt: 2 },
        ]));
        const g = await SavedListsStorage.save({ name: 'guest list', type: 'wheel', items: ['a', 'b'] });
        check('misafir kaydı local_only döner', g.sync === 'local_only', g.sync);
        await HistoryStorage.add('dice', 4);
        await HistoryStorage.add('coin', 'heads');
        check('misafirken buluta hiçbir şey gitmez', db.saved_lists.size === 2 && db.activity_history.size === 0);
        db.activity_history.set('pre', { id: 'pre', user_id: 'U', type: 'old', result: 'CLOUD', timestamp: Date.now() });

        login('U');
        await acct.syncLocalDataToAccount('U');
        const local = await SavedListsStorage.getAll();
        check('cihazda misafir listesi + bulut listeleri', ids(local) === ['cloudA', 'shared', g.list.id].sort().join(','), ids(local));
        check('misafir listesi hesaba yüklendi', cloudListIds('U') === ['cloudA', 'shared', g.list.id].sort().join(','));
        check('buluttaki mevcut liste ezilmedi', db.saved_lists.get('shared').name === 'CLOUD VERSION');
        check('misafir geçmişi yüklendi (2 yeni + 1 mevcut)', cloudHistory('U') === 3, cloudHistory('U'));
        check('buluttaki geçmiş satırına dokunulmadı', db.activity_history.get('pre').result === 'CLOUD');
        check('geçmiş-birleştirildi işareti U için kondu', store.get('@history_synced_user') === 'U');
    }],
    ['T2 sonraki açılışta geçmiş yeniden yüklenmez', async () => {
        net.calls = [];
        await acct.syncLocalDataToAccount('U');
        check('açılışta geçmiş upsert yok', !net.calls.includes('upsert:activity_history'), net.calls.join(' '));
    }],
    ['T3 çevrimdışı ilk giriş: misafir verisi kaybolmaz, sonraki açılışta tekrar denenir', quiet(async () => {
        reset();
        const g = await SavedListsStorage.save({ name: 'offline guest', type: 'general', items: ['a'] });
        await HistoryStorage.add('dice', 6);
        login('V'); net.offline = true;
        await acct.syncLocalDataToAccount('V');
        check('başarısız birleştirmede liste cihazda kalır', ids(await SavedListsStorage.getAll()) === g.list.id);
        check('başarısız geçmiş yüklemesinde işaret konmaz', !store.has('@history_synced_user'));
        net.offline = false;
        await acct.syncLocalDataToAccount('V');
        check('yeniden deneme listeyi yükler', cloudListIds('V') === g.list.id);
        check('yeniden deneme geçmişi yükler', cloudHistory('V') === 1);
    })],
    ['T4 çıkış: flush → yerel temizlik, ayarlar korunur, bulut sağlam', async () => {
        store.set('@pickforme:onboardingSeen', 'true');
        store.set('@pickforme:themeMode', 'light');
        store.set('appLanguage', 'tr');
        const g = await SavedListsStorage.save({ name: 'made while signed in', type: 'general', items: ['z'] });
        check('girişliyken kayıt anında senkronlanır', g.sync === 'synced');
        check('çevrimiçiyken flush güvenli der', await acct.flushLocalDataToCloud() === true);
        await acct.signOutAndClearLocal();
        check('oturum kapandı', net.session === null);
        check('listeler cihazdan silindi', (await SavedListsStorage.getAll()).length === 0);
        check('geçmiş cihazdan silindi', (await localHistory()).length === 0);
        check('onboarding/tema/dil korundu',
            store.get('@pickforme:onboardingSeen') === 'true' && store.get('@pickforme:themeMode') === 'light' && store.get('appLanguage') === 'tr');
        check('buluttaki listeler sağlam', cloudListIds('V').split(',').length === 2);
        check('buluttaki geçmiş sağlam', cloudHistory('V') === 1);
    }],
    ['T5 aynı hesapla tekrar giriş listeleri geri getirir', async () => {
        login('V');
        await acct.syncLocalDataToAccount('V');
        check('listeler buluttan geri geldi', (await SavedListsStorage.getAll()).length === 2);
    }],
    ['T6 flush buluta hiç gitmemiş veriyi yakalar', quiet(async () => {
        net.offline = true;
        const g = await SavedListsStorage.save({ name: 'offline edit', type: 'general', items: ['q'] });
        check('çevrimdışı kayıt failed döner', g.sync === 'failed', g.sync);
        check('çevrimdışıyken flush false', await acct.flushLocalDataToCloud() === false);
        net.offline = false;
        check('çevrimiçi olunca flush true ve yükler', await acct.flushLocalDataToCloud() === true && db.saved_lists.has(g.list.id));
    })],
    ['T7 aynı cihazda ikinci hesap ilkinin verisini görmez', async () => {
        await acct.signOutAndClearLocal();
        login('W');
        await acct.syncLocalDataToAccount('W');
        check('W cihazında V listesi yok', (await SavedListsStorage.getAll()).length === 0);
        check('W bulutunda V listesi yok', cloudListIds('W') === '');
    }],
    // Hata 1: giriş birleştirmesi sürerken çıkış yapılırsa hesabın listeleri
    // temizlikten SONRA cihaza geri yazılıyordu.
    ['T8 [hata 1] birleştirme sürerken çıkış: hesap verisi cihazda kalmaz', async () => {
        reset();
        seedCloudList('X', 'xa', 'X list');
        db.activity_history.set('xh', { id: 'xh', user_id: 'X', type: 't', result: 1, timestamp: Date.now() });
        await HistoryStorage.add('dice', 1); // misafir geçmişi → geçmiş yüklemesi de çalışsın
        login('X');
        net.delay = 30;
        const inflight = acct.syncLocalDataToAccount('X'); // SIGNED_IN ile başladı, sürüyor
        await sleep(5); // liste çekme isteği X'in oturumuyla yolda
        await acct.signOutAndClearLocal();
        await inflight;
        await sleep(100); // geç kalan her yazma gelsin
        const leaked = await SavedListsStorage.getAll();
        check('çıkıştan sonra cihazda hesap listesi yok', leaked.length === 0, `bulunan: ${ids(leaked)}`);
        check('geçmiş-birleştirildi işareti çıkıştan sonra geri yazılmadı', !store.has('@history_synced_user'),
            String(store.get('@history_synced_user')));
    }],
    // Hata 1 düzeltmesinin yan etkisi olmasın: iptal edilen eski tur, hemen
    // ardından giren hesabın kendi birleştirmesini engellememeli.
    ['T8b iptal edilen birleştirme, sonraki girişin birleştirmesini engellemez', async () => {
        reset();
        seedCloudList('X', 'xa', 'X list');
        seedCloudList('Z', 'za', 'Z list');
        login('X');
        net.delay = 30;
        const stale = acct.syncLocalDataToAccount('X');
        await sleep(5);
        await acct.signOutAndClearLocal();
        login('Z');
        const fresh = acct.syncLocalDataToAccount('Z');
        check('yeni giriş eski (iptal) turu geri almaz', fresh !== stale);
        await Promise.all([stale, fresh]);
        const local = await SavedListsStorage.getAll();
        check('cihazda yalnızca Z listesi', ids(local) === 'za', ids(local));
    }],
    // Hata 2: çevrimdışıyken "Yine de çıkış yap" hiçbir şey yapmıyor ve
    // kullanıcıya bunu söylemiyordu.
    ['T9 [hata 2] çevrimdışı çıkış başarısızlığı bildirilir, veri silinmez', quiet(async () => {
        reset();
        login('Y');
        const g = await SavedListsStorage.save({ name: 'Y list', type: 'general', items: ['a'] });
        net.offline = true;
        const result = await acct.signOutAndClearLocal();
        check('çağırana başarısızlık bildirilir', result === 'failed', `dönen: ${JSON.stringify(result)}`);
        check('oturum açık kalır (yarım çıkış yok)', net.session?.user?.id === 'Y');
        check('yerel veri silinmez', ids(await SavedListsStorage.getAll()) === g.list.id);
        net.offline = false;
        const again = await acct.signOutAndClearLocal();
        check('çevrimiçi tekrar denemede çıkış başarılı', again === 'signed_out' && net.session === null, JSON.stringify(again));
    })],
];

(async () => {
    for (const [name, fn] of tests) {
        console.log(name);
        try { await fn(); }
        catch (e) { fail++; console.log('  FAIL (exception)', e && e.message); }
    }
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
