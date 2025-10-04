-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TEXT NOT NULL,
  client_name TEXT NOT NULL,
  proposal_number TEXT,
  notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('item', 'group')),
  name TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sum DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_order ON public.invoice_items(invoice_id, item_order);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow all operations on invoices" ON public.invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_items" ON public.invoice_items
  FOR ALL USING (true) WITH CHECK (true);
