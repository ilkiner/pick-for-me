-- FAZ 5: activity_history kötüye kullanım sınırları
-- Supabase SQL Editor'da çalıştır (ya da supabase db push)
--
-- Sorun: `result` jsonb'sinin boyut sınırı, kullanıcı başına satır sınırı yoktu.
-- Geçerli bir hesabı olan biri istemciyi değiştirip sınırsız veri yazabilir ve
-- depolama maliyetini şişirebilirdi. RLS başkasının verisine erişimi engelliyor
-- ama KENDİ satırlarını sınırsız büyütmesini engellemiyordu.
--
-- Not: saved_lists.items de sınırsız. Liste sayısı uygulama tarafında Pro
-- limitiyle sınırlı olduğu için buraya dahil edilmedi; ileride benzer bir kısıt
-- eklemek gerekebilir.

-- ─── 1. Satır boyutu ─────────────────────────────────────────────────────────
-- Gerçek kayıtlar birkaç yüz bayt (tip + tek bir sonuç nesnesi). 4 KB, en
-- karmaşık sonuç için bile bol bir tavan; kötüye kullanımı ise etkili keser.
ALTER TABLE public.activity_history
    ADD CONSTRAINT activity_history_result_size
    CHECK (pg_column_size(result) < 4096);

-- ─── 2. Kullanıcı başına satır sınırı ────────────────────────────────────────
-- 1000 satır. Gerekçe:
--   * İstemci geçmişi zaten en fazla 500 satır çekiyor (syncService: .limit(500)),
--     yani 500'ün ötesi hiçbir zaman gösterilmiyor.
--   * En uzun saklama penceresi 10 gün (Pro). Günde 50 sonuç üreten ağır bir
--     kullanıcı 10 günde ~500 satır yapar.
--   * 1000, gerçekçi tavanın iki katı; kullanıcı başına depolamayı en kötü
--     durumda ~4 MB ile sınırlar (1000 × 4 KB).
--
-- Sınır aşılınca EN ESKİ satırlar siliniyor, insert reddedilmiyor. Reddetmek
-- meşru ağır kullanıcıya senkronizasyon hatası uyarısı gösterirdi; halka tampon
-- davranışı ise uygulamanın zaten uyguladığı saklama mantığıyla örtüşüyor
-- (eski geçmiş nasılsa görüntülenmiyor).
CREATE OR REPLACE FUNCTION public.activity_history_enforce_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY INVOKER (varsayılan) BİLEREK seçildi, DEFINER DEĞİL.
-- BEFORE INSERT tetikleyicisi, INSERT'in RLS WITH CHECK denetiminden ÖNCE
-- çalışır; yani bu noktada NEW.user_id henüz doğrulanmamıştır. Invoker olarak
-- kalınca içerideki DELETE de RLS'e tabi olur ve saldırgan NEW.user_id'ye
-- başkasının kimliğini yazsa bile o satırları silemez (insert de zaten WITH
-- CHECK ile reddedilir). DEFINER yapmak bu korumayı ortadan kaldırırdı.
SET search_path = pg_catalog, public
AS $$
DECLARE
    max_rows CONSTANT integer := 1000;
    current_rows integer;
BEGIN
    -- Tam sayım yerine LIMIT ile sınırlanmış sayım: tarama en fazla max_rows
    -- indeks girdisi okur, maliyet satır sayısıyla büyümez.
    SELECT count(*) INTO current_rows
    FROM (
        SELECT 1
        FROM public.activity_history
        WHERE user_id = NEW.user_id
        LIMIT max_rows
    ) probe;

    IF current_rows >= max_rows THEN
        -- "En yeni (max_rows - 1) satırı tut, kalanı sil" biçiminde yazıldı.
        -- Sayıya dayalı bir "şu kadar sil" kurgusu, sayım LIMIT ile
        -- sınırlandığı için tablo zaten limitin üstündeyse onu hiç aşağı
        -- çekemezdi (her insert 1 siler, 1 ekler → sayı sabit kalırdı).
        -- Bu hâliyle fazlalık tek seferde temizlenir.
        DELETE FROM public.activity_history
        WHERE user_id = NEW.user_id
          AND id NOT IN (
              SELECT id
              FROM public.activity_history
              WHERE user_id = NEW.user_id
              ORDER BY timestamp DESC, id DESC
              LIMIT max_rows - 1
          );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_history_limit ON public.activity_history;

CREATE TRIGGER activity_history_limit
    BEFORE INSERT ON public.activity_history
    FOR EACH ROW EXECUTE FUNCTION public.activity_history_enforce_limit();

-- Fonksiyon yalnızca tetikleyici bağlamında anlamlı; RPC olarak açıkta durmasın.
-- (Denetçi public.rls_auto_enable için de aynı uyarıyı veriyor.)
REVOKE EXECUTE ON FUNCTION public.activity_history_enforce_limit() FROM PUBLIC, anon, authenticated;
