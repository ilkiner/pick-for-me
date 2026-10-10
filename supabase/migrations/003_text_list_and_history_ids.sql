-- saved_lists.id ve activity_history.id: uuid → text
--
-- Uygulama ID'leri istemcide üretiyor (Date.now() + base36, ör. "17915700785991sk8d")
-- ve sütun uuid olduğu için HER yazma "invalid input syntax for type uuid" ile
-- reddediliyordu: bulut senkronu ilk günden beri hiç çalışmadı, iki tablo da boş.
--
-- id'ye başvuran FK, view ya da RPC yok; RLS politikaları user_id'ye bakıyor;
-- iki tetikleyici (set_updated_at, activity_history_enforce_limit) id tipinden
-- bağımsız. PK korunuyor, uuid varsayılanı kaldırılıyor (id her zaman istemciden
-- geliyor). Biçim kısıtı: istemcinin ürettiği ID'ler ve olası eski uuid'ler
-- geçsin, keyfi/uzun değerler geçmesin.

DO $$
BEGIN
    -- Koruma: dönüşüm boş tablolar varsayımıyla yazıldı.
    IF EXISTS (SELECT 1 FROM public.saved_lists) OR EXISTS (SELECT 1 FROM public.activity_history) THEN
        RAISE EXCEPTION 'saved_lists / activity_history not empty — review before converting id to text';
    END IF;
END $$;

ALTER TABLE public.saved_lists
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ADD CONSTRAINT saved_lists_id_format CHECK (id ~ '^[A-Za-z0-9_-]{1,64}$');

ALTER TABLE public.activity_history
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id TYPE text USING id::text,
    ADD CONSTRAINT activity_history_id_format CHECK (id ~ '^[A-Za-z0-9_-]{1,64}$');
