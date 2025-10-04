-- Migration script to update proposals table structure to match ProposalService expectations

-- First, create the new proposals table structure
CREATE TABLE IF NOT EXISTS public.proposals_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number TEXT NOT NULL,
  proposal_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  proposal_date DATE NOT NULL,
  notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create proposal_items table for storing individual items
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals_new(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('item', 'group')),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'шт.',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sum DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing data from old proposals table to new structure
INSERT INTO public.proposals_new (
  id, proposal_number, proposal_name, client_name, proposal_date, notes, created_at, updated_at
)
SELECT 
  id,
  proposal_number,
  proposal_number as proposal_name, -- Use proposal_number as proposal_name for existing records
  client_name,
  proposal_date,
  notes,
  created_at,
  updated_at
FROM public.proposals
WHERE id NOT IN (SELECT id FROM public.proposals_new);

-- Migrate items from JSONB rows to proposal_items table
INSERT INTO public.proposal_items (
  proposal_id, item_order, item_type, name, quantity, unit, price, sum
)
SELECT 
  p.id as proposal_id,
  (row_number() OVER (PARTITION BY p.id ORDER BY (item->>'id'))) - 1 as item_order,
  COALESCE(item->>'type', 'item') as item_type,
  item->>'name' as name,
  COALESCE((item->>'quantity')::integer, 1) as quantity,
  COALESCE(item->>'unit', 'шт.') as unit,
  COALESCE((item->>'price')::decimal, 0) as price,
  COALESCE((item->>'sum')::decimal, 0) as sum
FROM public.proposals p,
     jsonb_array_elements(p.rows) as item
WHERE p.rows IS NOT NULL 
  AND jsonb_array_length(p.rows) > 0
  AND p.id NOT IN (
    SELECT DISTINCT proposal_id FROM public.proposal_items
  );

-- Update total_amount in new proposals table
UPDATE public.proposals_new 
SET total_amount = (
  SELECT COALESCE(SUM(sum), 0) 
  FROM public.proposal_items 
  WHERE proposal_id = proposals_new.id AND item_type = 'item'
);

-- Drop old table and rename new one
DROP TABLE IF EXISTS public.proposals CASCADE;
ALTER TABLE public.proposals_new RENAME TO proposals;

-- Enable Row Level Security
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.proposals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.proposals FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.proposal_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.proposal_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.proposal_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.proposal_items FOR DELETE USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_number ON public.proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_order ON public.proposal_items(proposal_id, item_order);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
