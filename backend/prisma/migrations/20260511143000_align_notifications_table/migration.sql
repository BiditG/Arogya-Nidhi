CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  type varchar(100),
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

UPDATE public.notifications
SET message = ''
WHERE message IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN message SET NOT NULL,
  ALTER COLUMN is_read SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN type DROP NOT NULL;

ALTER TABLE public.notifications
  ALTER COLUMN title TYPE varchar(255),
  ALTER COLUMN type TYPE varchar(100);

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON public.notifications USING btree (is_read);
