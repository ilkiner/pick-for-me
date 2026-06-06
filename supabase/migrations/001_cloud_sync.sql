-- FAZ 4: Cloud Sync tables with hardened RLS
-- Run this in Supabase SQL Editor (or via supabase db push)

-- ─── saved_lists ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_lists (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    type        text        NOT NULL CHECK (type IN ('wheel','movie','order','general')),
    items       jsonb       NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
    created_at  bigint      NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at  bigint      NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS saved_lists_user_id_idx ON public.saved_lists (user_id);

ALTER TABLE public.saved_lists ENABLE ROW LEVEL SECURITY;

-- Split per-operation policies (audit recommendation)
CREATE POLICY "lists_select" ON public.saved_lists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lists_insert" ON public.saved_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lists_update" ON public.saved_lists
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lists_delete" ON public.saved_lists
    FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at on server side so clients can't backdate
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = (extract(epoch from now()) * 1000)::bigint;
    RETURN NEW;
END;
$$;

CREATE TRIGGER saved_lists_updated_at
    BEFORE UPDATE ON public.saved_lists
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── activity_history ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_history (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type        text        NOT NULL CHECK (char_length(type) BETWEEN 1 AND 50),
    result      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    timestamp   bigint      NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS activity_history_user_id_ts_idx
    ON public.activity_history (user_id, timestamp DESC);

ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_select" ON public.activity_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "history_insert" ON public.activity_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "history_delete" ON public.activity_history
    FOR DELETE USING (auth.uid() = user_id);
