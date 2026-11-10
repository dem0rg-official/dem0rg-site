# DeM0RG — персональный сайт-портфолио

Сайт Алексея (DeM0RG). Композиция взята из макета `site.svg`: bento-сетка из
шести блоков — about me, counter, contacts, last track, friends, projects —
в терминальной эстетике Omarchy (JetBrains Mono, тёмный графит, лавандовый
акцент, мигающий курсор в заголовках).

## Стек

- **Сервер:** Node.js (≥ 22.5) + Express, встроенный `node:sqlite` — без нативных зависимостей
- **Фронт:** ванильный HTML/CSS + ES-модули, без сборки
- **БД:** SQLite-файл `data/visits.db` — счётчик посещений как таблица записей

## Запуск

```bash
npm install
npm start          # → http://localhost:3000
# или в режиме разработки с автоперезапуском:
npm run dev
```

## Структура

```
server/
  index.js     — Express: статика + API (/api/visits, /api/projects, /api/last-track)
  db.js        — SQLite: таблица visits (никнейм + время)
  github.js    — загрузка репозиториев GitHub с кэшем на 10 минут
  statsfm.js   — модуль интеграции со stats.fm (последний трек из Spotify)
public/
  index.html   — разметка bento-сетки
  styles.css   — палитра, сетка из site.svg, адаптив до 360px
  js/          — модули-компоненты: counter, track, projects, api-клиент
  assets/      — vantablack.webp (фон hero-блока), фолбэк-аватар
```

## Настройка внешних источников

Все ключи задаются **только на сервере** — скопируйте `.env.example` в `.env`.

### Счётчик посещений
Ничего настраивать не нужно: база создаётся сама при первом запуске.
Счётчик растёт только после ввода никнейма и нажатия «отметиться».

### GitHub (проекты)
Работает без токена (лимит 60 запросов/час на IP). Для повышения лимита
(5000/час) создайте токен без прав на https://github.com/settings/tokens и
укажите `GITHUB_TOKEN` в `.env`.

### stats.fm (последний трек)
1. Зарегистрируйтесь на https://stats.fm и подключите Spotify.
2. Сделайте профиль публичным в настройках stats.fm.
3. Укажите ник в `.env`: `STATSFM_USER=ваш_ник`.

Данные берутся с официального публичного эндпоинта
`GET https://api.stats.fm/api/v1/users/{user}/streams/recent?limit=1`.
Пока профиль не настроен, блок показывает понятную заглушку — источник
подключится сам после задания переменной.

## Аватар

Аватар тянется с GitHub (`avatars.githubusercontent.com/dem0rg-official`).
Если он недоступен, показывается локальная заглушка `assets/avatar-fallback.svg`.
