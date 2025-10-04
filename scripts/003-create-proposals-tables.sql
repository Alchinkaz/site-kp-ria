-- Удаляем существующие таблицы если они есть (осторожно!)
DROP TABLE IF EXISTS proposal_items CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;

-- Создание таблицы для хранения коммерческих предложений
CREATE TABLE proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_number VARCHAR(50) NOT NULL,
  proposal_name VARCHAR(200) NOT NULL,
  client_name TEXT NOT NULL,
  proposal_date DATE NOT NULL,
  notes TEXT,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для хранения позиций коммерческого предложения
CREATE TABLE proposal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
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
CREATE INDEX idx_proposals_proposal_number ON proposals(proposal_number);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_proposal_name ON proposals(proposal_name);
CREATE INDEX idx_proposal_items_proposal_id ON proposal_items(proposal_id);
CREATE INDEX idx_proposal_items_order ON proposal_items(proposal_id, item_order);

-- Создание функции для автоматического обновления updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_proposals_updated_at 
    BEFORE UPDATE ON proposals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности (разрешаем все операции для анонимных пользователей)
CREATE POLICY "Allow all operations on proposals" ON proposals
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on proposal_items" ON proposal_items
    FOR ALL USING (true) WITH CHECK (true);

-- Вставляем тестовую запись для проверки
INSERT INTO proposals (proposal_number, proposal_name, client_name, proposal_date, notes, total_amount)
VALUES ('КП-250109-001', 'Тестовое предложение', 'Тестовый клиент', CURRENT_DATE, 'Тестовая запись для проверки работы таблиц', 5000.00);

-- Вставляем тестовые позиции
INSERT INTO proposal_items (proposal_id, item_order, item_type, name, quantity, unit, price, sum)
SELECT 
    p.id,
    0,
    'item',
    'Тестовая позиция',
    1,
    'шт.',
    5000.00,
    5000.00
FROM proposals p 
WHERE p.proposal_number = 'КП-250109-001';

-- Проверяем что данные вставились
SELECT 'Proposals table created and populated' as status, count(*) as proposal_count FROM proposals;
SELECT 'Proposal items table created and populated' as status, count(*) as item_count FROM proposal_items;
