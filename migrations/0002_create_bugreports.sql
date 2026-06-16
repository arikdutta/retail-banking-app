CREATE TABLE IF NOT EXISTS public.bugreports (
    id                BIGSERIAL PRIMARY KEY,
    unid              UUID NOT NULL DEFAULT gen_random_uuid(),
    bugtype           VARCHAR(50) NOT NULL,
    similarityhash    INTEGER NOT NULL,
    message           TEXT,
    exceptionmessage  VARCHAR(512),
    stacktrace        TEXT,
    userlogin         VARCHAR(255),
    url               TEXT,
    useragent         VARCHAR(512),
    application       VARCHAR(100),
    created           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bugreports_unid_key UNIQUE (unid)
);

CREATE INDEX IF NOT EXISTS idx_bugreports_created       ON public.bugreports (created DESC);
CREATE INDEX IF NOT EXISTS idx_bugreports_similarityhash ON public.bugreports (similarityhash);
CREATE INDEX IF NOT EXISTS idx_bugreports_bugtype        ON public.bugreports (bugtype);
