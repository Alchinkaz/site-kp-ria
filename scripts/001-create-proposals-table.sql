-- Updated schema to match ProposalService expectations with separate tables
-- Create proposals table for storing commercial proposals
CREATE TABLE IF NOT EXISTS public.proposals (
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
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('item', 'group')),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'шт.',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sum DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required for this use case)
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
