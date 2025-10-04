# Переменные окружения для проекта KP RIA

## Настройка для локальной разработки

Создайте файл `.env.local` в корне проекта со следующими переменными:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Настройка для Vercel

В настройках проекта Vercel добавьте переменные окружения:

1. Перейдите в Settings → Environment Variables
2. Добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL вашего проекта Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon key из настроек проекта Supabase

## Получение данных Supabase

1. Войдите в ваш проект на supabase.com
2. Перейдите в Settings → API
3. Используйте:
   - **URL**: Project URL
   - **Anon Key**: anon public key

## Примечание

Файл `.env.local` добавлен в `.gitignore` и не будет загружен в репозиторий для безопасности.
