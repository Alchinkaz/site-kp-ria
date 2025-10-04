# API Документация для системы коммерческих предложений

## Базовый URL
`/api`

## Endpoints

### Предложения (Proposals)

#### GET /api/proposals
Получить все предложения
\`\`\`json
Response:
{
  "success": true,
  "data": [...]
}
\`\`\`

#### POST /api/proposals
Создать новое предложение
\`\`\`json
Request:
{
  "proposalNumber": "КП-001",
  "clientName": "Название клиента",
  "editableDate": "2024-01-01",
  "rows": [...],
  "notes": "Примечания"
}

Response:
{
  "success": true,
  "data": { ... }
}
\`\`\`

#### GET /api/proposals/[id]
Получить конкретное предложение

#### PUT /api/proposals/[id]
Обновить предложение

#### DELETE /api/proposals/[id]
Удалить предложение

### Товары в предложении

#### POST /api/proposals/[id]/products
Добавить товары в предложение
\`\`\`json
Request:
{
  "products": [
    {
      "name": "Название товара",
      "quantity": 1,
      "unit": "шт",
      "price": 1000,
      "photo": "base64_string_or_url"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "message": "Добавлено 1 товаров в предложение",
    "addedProducts": [...]
  }
}
\`\`\`

### Поиск товаров

#### GET /api/products/search?q=поиск&category=категория&limit=20
Поиск товаров для добавления в предложение

## Пример использования с сайта

\`\`\`javascript
// Добавление выбранных товаров в предложение
async function addProductsToProposal(proposalId, selectedProducts) {
  const response = await fetch(`/api/proposals/${proposalId}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      products: selectedProducts
    })
  });
  
  const result = await response.json();
  return result;
}

// Создание нового предложения с товарами
async function createProposalWithProducts(clientName, products) {
  const response = await fetch('/api/proposals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientName,
      rows: products.map(p => ({
        id: Date.now().toString(),
        type: 'item',
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
        price: p.price,
        sum: p.quantity * p.price,
        photo: p.photo
      }))
    })
  });
  
  const result = await response.json();
  return result;
}
