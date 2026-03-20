-- Migration: add password_hash column to users if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
    ALTER TABLE public.users ADD COLUMN password_hash character varying(255);
  END IF;
END$$;

-- Ensure refresh_tokens table has token_hash column (should exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='token_hash') THEN
    ALTER TABLE public.refresh_tokens ADD COLUMN token_hash character varying(512);
  END IF;
END$$;
