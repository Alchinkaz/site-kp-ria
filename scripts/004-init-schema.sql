-- Unified schema for KP RIA (proposals + invoices)
-- Safe to run multiple times (IF NOT EXISTS where possible)

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function: updated_at auto-update ---------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PROPOSALS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number TEXT NOT NULL UNIQUE,
  proposal_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  proposal_date DATE NOT NULL,
  notes TEXT,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('item', 'group')),
  name TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'шт.',
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  sum DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (proposals)
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_number ON public.proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_order ON public.proposal_items(proposal_id, item_order);

-- Trigger (proposals)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_proposals_updated_at'
  ) THEN
    CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS (proposals)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- SELECT/INSERT/UPDATE/DELETE for anon (adjust in production!)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on proposals'
  ) THEN
    CREATE POLICY "Allow all on proposals" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on proposal_items'
  ) THEN
    CREATE POLICY "Allow all on proposal_items" ON public.proposal_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- INVOICES -----------------------------------------------------------------
-- NOTE: invoice_date is TEXT to match UI-provided locale date strings (e.g. ru-RU)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TEXT NOT NULL,
  client_name TEXT NOT NULL,
  proposal_number TEXT,
  notes TEXT,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('item', 'group')),
  name TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  sum DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (invoices)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_order ON public.invoice_items(invoice_id, item_order);

-- Trigger (invoices)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at'
  ) THEN
    CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS (invoices)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on invoices'
  ) THEN
    CREATE POLICY "Allow all on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on invoice_items'
  ) THEN
    CREATE POLICY "Allow all on invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Optional seed to verify write access (comment out in prod)
-- INSERT INTO public.invoices (invoice_number, invoice_date, client_name, proposal_number, notes, total_amount)
-- VALUES ('ТЕСТ-001', TO_CHAR(CURRENT_DATE, 'DD.MM.YYYY'), 'Тестовый клиент', 'КП-001', 'Тестовая запись', 1000.00)
-- ON CONFLICT DO NOTHING;


