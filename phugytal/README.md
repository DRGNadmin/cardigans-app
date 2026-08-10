# Phugytal

Публичный сайт-информатор Чемпионата России по фиджитал спорту: сетки и расписание по дисциплинам + админка.

## Дисциплины

| Slug | Цвет | Направление |
|------|------|-------------|
| `fifa` | `#00FF00` | Футбольное двоеборье |
| `nhl` | `#00E6FF` | Хоккейное двоеборье |
| `nba` | `#FB5608` | Баскетбольное двоеборье |
| `cs2` | `#FFD31C` | Тактическое двоеборье |
| `rhythm` | `#FF006E` | Ритм-симулятор |

## Запуск

```bash
cd Phugytal
npm install
npm run db:setup
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

Админка: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

Учётка суперадмина задаётся в `.env`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Возможности

- Форматы сеток: Single Elimination, Double Elimination, Round Robin, Swiss, Groups → Playoffs
- Ручной / авто посев (order, random, snake)
- Переименование стадий (Round 1, LB Round 1, …)
- Счёт матча обновляет сетку и расписание
- Роли: `SUPER_ADMIN` и `DISCIPLINE_ADMIN` (только своя дисциплина)
