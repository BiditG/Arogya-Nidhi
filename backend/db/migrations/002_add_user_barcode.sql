DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE public.users ADD COLUMN barcode VARCHAR(32);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users' AND indexname = 'users_barcode_key'
  ) THEN
    CREATE UNIQUE INDEX users_barcode_key ON public.users (barcode);
  END IF;
END $$;
