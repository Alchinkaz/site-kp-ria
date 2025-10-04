-- Создание таблицы для хранения счетов
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  proposal_number VARCHAR(50),
  notes TEXT,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для хранения позиций счета
CREATE TABLE invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('item', 'group')),
  name TEXT NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 0,
  unit VARCHAR(20) DEFAULT '',
  price DECIMAL(15,2) DEFAULT 0,
  sum DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_order ON invoice_items(invoice_id, item_order);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности (разрешаем все операции для анонимных пользователей)
-- В продакшене следует настроить более строгие политики
CREATE POLICY "Allow all operations on invoices" ON invoices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_items" ON invoice_items
    FOR ALL USING (true) WITH CHECK (true);
