# Project Management API

**Система управління проєктами та робочими процесами** — бекенд-додаток на NestJS (мікросервісна архітектура) для організації робочих просторів, проєктів, спринтів, завдань, учасників, тегів, коментарів та часових логів. Підтримує автентифікацію, пагінацію, сортування та рольове управління в межах робочого простору.

---

## Зміст

- [Лабораторні роботи (Windows)](#лабораторні-роботи-windows)
- [Технологічний стек](#технологічний-стек)
- [Структура монорепо](#структура-монорепо)
- [Швидкий запуск (Docker Compose)](#швидкий-запуск-docker-compose)
- [Kubernetes (Minikube)](#kubernetes-minikube)
- [Запуск сервісів окремо (локально)](#запуск-сервісів-окремо-локально)
- [Конфігурація](#конфігурація)
- [Кешування (Redis)](#кешування-redis)
- [API та маршрути](#api-та-маршрути)
- [Ліцензія](#ліцензія)

---

## Лабораторні роботи (Windows)

Покрокові інструкції та команди для лабораторних робіт (декомпозиція, кешування, Docker, Kubernetes) — **[LAB_INSTRUCTIONS.md](./LAB_INSTRUCTIONS.md)**.

---

## Технологічний стек

| Категорія        | Технологія |
|------------------|------------|
| **Фреймворк**    | [NestJS](https://nestjs.com/) 11 |
| **Мова**         | TypeScript 5.x |
| **ORM**          | [Prisma](https://www.prisma.io/) 7.x (PostgreSQL) |
| **База даних**   | PostgreSQL |
| **Валідація**    | class-validator, class-transformer |
| **Документація API** | Swagger (OpenAPI) |
| **Автентифікація**  | JWT (@nestjs/jwt), bcrypt |
| **Кешування**   | Redis, @nestjs/cache-manager, @keyv/redis |
| **Конфігурація** | @nestjs/config (змінні середовища) |

---

## Модель даних

Ієрархія сутностей:

```
User
  └── Participant (роль у Workspace: Admin / Member)
        └── Workspace
              ├── Project
              │     ├── Sprint
              │     │     └── Task (опційно в спринті)
              │     └── Task
              │           ├── Comment
              │           ├── Log
              │           └── Tag (many-to-many)
              └── Tag (глобальні для workspace)
```

### Основні сутності

- **Workspace** — робочий простір (назва, опційний опис); містить проєкти, теги та учасників.
- **Project** — проєкт у межах workspace; має назву, опис, завдання та спринти.
- **Sprint** — ітерація з датами початку/кінця; збирає завдання для доставки.
- **Task** — завдання з пріоритетом (LOW, MEDIUM, HIGH, URGENT), статусом (BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE), дедлайном, призначеними виконавцями (User), коментарями, тегами та логами.
- **User** — користуч; логін, реєстрація, профіль; участь у workspace через Participant, призначення на Task.
- **Participant** — зв’язок User–Workspace з роллю (Admin / Member); адміни можуть змінювати workspace, проєкти, видаляти тощо.
- **Tag** — тег у межах workspace; прив’язка до завдань (many-to-many).
- **Comment** — коментар до завдання.
- **Log** — запис історії дій по завданню (action, message, userId).

Кожен сервіс має власну схему в `services/<service>/prisma/schema.prisma` та міграції.

---

## Структура монорепо

```
project-managment/
├── packages/shared/            # PaginationDto, PaginationMeta
├── services/
│   ├── user-auth/              # :3001 — User, Auth, JWT
│   ├── workspace/              # :3002 — Workspaces, Participants, Tags
│   ├── project-task/           # :3003 — Projects, Sprints, Tasks, Comments, Logs
│   └── api-gateway/            # :3000 — Reverse proxy (single entry point)
├── k8s/                        # Kubernetes manifests (Deployments, Services, ConfigMaps, Secrets)
├── scripts/                    # k8s-build.ps1, k8s-deploy.ps1, k8s-build.sh, k8s-deploy.sh
├── e2e/                        # E2E-тести міжсервісної взаємодії
├── docker-compose.yml
├── .env.example
└── package.json                # npm workspaces
```

Кожен сервіс має свою PostgreSQL: `user_db` (5435), `workspace_db` (5436), `project_task_db` (5437). Redis (6379) використовується сервісом workspace для кешування.

---

## Швидкий запуск (Docker Compose)

1. Клонування та змінні:

   ```bash
   git clone <repository-url>
   cd project-managment
   cp .env.example .env
   ```

   Відредагуйте `.env` при потребі (мінімум — `JWT_SECRET`).

2. Запуск усіх сервісів:

   ```bash
   docker-compose up -d --build
   ```

   Без `-d` — логи в консолі. З `-d` — запуск у фоні.

   - API Gateway: `http://localhost:3000`
   - user-auth: `http://localhost:3001`
   - workspace: `http://localhost:3002`
   - project-task: `http://localhost:3003`

   Prisma-міграції виконуються автоматично при старті контейнерів.

---

## Kubernetes (Minikube)

Для запуску в Minikube потрібні: **Docker Desktop**, **Minikube**, **kubectl**.

### Перший запуск

```powershell
minikube start
minikube docker-env | Invoke-Expression
.\scripts\k8s-build.ps1
.\scripts\k8s-deploy.ps1
kubectl port-forward -n project-management svc/api-gateway 3000:3000
```

API доступний за `http://localhost:3000`. `port-forward` має залишатися запущеним в окремому терміналі.

### Після перезапуску ПК

```powershell
minikube start
kubectl port-forward -n project-management svc/api-gateway 3000:3000
```

Повний перелік команд, масштабування, rolling update — **[LAB_INSTRUCTIONS.md](./LAB_INSTRUCTIONS.md)**.

---

## Запуск сервісів окремо (локально)

**Передумови:** Node.js 18+, PostgreSQL (локально або `docker-compose up -d user_db workspace_db project_task_db`). Для workspace потрібен Redis (локально або `docker-compose up -d redis`).

**Порядок:** user-auth → workspace → project-task → api-gateway.

### E2E-тест (міжсервісна взаємодія)

Запустіть сервіси (`docker-compose up` або локально), потім:

```bash
npm run test:e2e
```

Або з автоматичним підняттям контейнерів:

```bash
npm run test:e2e:docker
```

Тест перевіряє: реєстрацію → токен → створення workspace → додавання participant (User Service) → створення проєкту → створення задачі з assignees та tags (User + Workspace).

Змінна `TEST_API_GATEWAY_URL` у `.env.test` (за замовчуванням `http://localhost:3000`).

| Сервіс | Команди |
|--------|---------|
| user-auth | `cd services/user-auth && cp .env.example .env && npx prisma migrate dev && npx prisma generate && npm run start:dev` |
| workspace | `cd services/workspace && cp .env.example .env && npx prisma migrate dev && npx prisma generate && npm run start:dev` |
| project-task | `cd services/project-task && cp .env.example .env && npx prisma migrate dev && npx prisma generate && npm run start:dev` |
| api-gateway | `cd services/api-gateway && cp .env.example .env && npm run start:dev` |

---

## Конфігурація

| Змінна | Опис | Приклад |
|--------|------|---------|
| `DATABASE_URL` | PostgreSQL для сервісу | `postgresql://user:password@localhost:5435/user_auth_db` |
| `REDIS_URL` | URL Redis (для workspace) | `redis://localhost:6379` |
| `CACHE_TTL_SECONDS` | Час життя запису в кеші (секунди) | `300` |
| `JWT_SECRET` | Секрет для JWT | довільний рядок |
| `USER_SERVICE_URL` | URL user-auth | `http://localhost:3001` |
| `WORKSPACE_SERVICE_URL` | URL workspace | `http://localhost:3002` |
| `PROJECT_TASK_SERVICE_URL` | URL project-task | `http://localhost:3003` |
| `PORT` | Порт сервісу | `3000`, `3001`, тощо |

Повний приклад — у `.env.example`.

### Кешування (Redis)

Сервіс **workspace** кешує ендпоінт `GET /workspaces/:workspaceId` у Redis. Кеш зменшує навантаження на БД і прискорює повторні запити.

| Змінна | Опис |
|--------|------|
| `REDIS_URL` | Рядок підключення до Redis (наприклад `redis://redis:6379` у Docker, `redis://localhost:6379` локально) |
| `CACHE_TTL_SECONDS` | Час життя запису в кеші (за замовчуванням 300 с). Після оновлення або видалення workspace відповідний ключ очищається |

**Перевірка роботи кешу**

1. Запустіть систему: `docker-compose up -d --build`
2. Отримайте JWT: `POST /auth/login` з `email` та `password`
3. Створіть workspace: `POST /workspaces` з `{"name":"Test WS","description":"..."}`
4. **Перший виклик** (без кешу): `GET /workspaces/:workspaceId` з заголовком `Authorization: Bearer <token>` — відповідь береться з БД, час відповіді більший
5. **Повторний виклик** (з кешу): той самий `GET /workspaces/:workspaceId` — відповідь береться з Redis, час відповіді менший
6. **Інвалідація**: після `PUT /workspaces/:workspaceId` або `DELETE /workspaces/:workspaceId` кеш очищається; наступний GET знову йде в БД

Приклад порівняння часу (curl з `-w "%{time_total}"`): перший виклик — ~50–100 ms, повторний — ~5–15 ms.

### Архітектура та перевірки

- **Залежності:** Немає циклів. user-auth не викликає інші сервіси; workspace → user-auth; project-task → user-auth, workspace.
- **JWT:** Один `JWT_SECRET` для всіх сервісів. Валідація в Gateway (публічні лише `/auth/login`, `/auth/register`) і в кожному backend (AuthGuard) для захисту при прямому зверненні.
- **DTO:** `packages/shared` містить `PaginationDto`, `PaginationMeta`, `buildPaginationMeta`. Використовується в workspace та project-task.
- **Міграції Prisma:** Окрема папка `prisma/migrations` у кожному сервісі (user-auth, workspace, project-task). При старті контейнерів виконується `prisma migrate deploy`, fallback — `db push`.

---

## API та маршрути

Базовий URL: `http://localhost:3000`.

### Загальна схема

- **Автентифікація:** усі маршрути, крім `POST /auth/login` та `POST /auth/register`, за замовчуванням захищені JWT (Bearer token).
- **Ієрархія:** більшість ресурсів прив’язані до `workspaceId`, далі `projectId`, для завдань — `taskId` тощо.
- **Списочні методи (GET списків)** повертають об’єкт `{ data: T[], meta: PaginationMeta }` з підтримкою query-параметрів пагінації та сортування.

### Основні групи маршрутів

| Метод | Шлях | Опис |
|-------|------|------|
| **Auth** |
| POST | `/auth/register` | Реєстрація |
| POST | `/auth/login` | Вхід (повертає JWT) |
| GET  | `/auth` | Профіль поточного користувача (потрібен Bearer) |
| PATCH | `/auth/profile` | Редагування власного профілю: fullname, position, email, newPassword (потрібен Bearer) |
| POST | `/auth/logout` | Вихід |
| **Workspaces** |
| GET  | `/workspaces` | Список робочих просторів (пагінація) |
| GET  | `/workspaces/:workspaceId` | Один workspace |
| POST | `/workspaces` | Створення workspace (body: `name`, опційно `description`) |
| PATCH| `/workspaces/:workspaceId` | Оновлення (Admin; body: опційно `name`, `description`) |
| DELETE | `/workspaces/:workspaceId` | Видалення (Admin) |
| **Projects** |
| GET  | `/workspaces/:workspaceId/projects` | Список проєктів (пагінація) |
| GET  | `/workspaces/:workspaceId/projects/:projectId` | Один проєкт |
| POST | `/workspaces/:workspaceId/projects` | Створення проєкту |
| PATCH| `/workspaces/:workspaceId/projects/:projectId` | Оновлення |
| DELETE | `/workspaces/:workspaceId/projects/:projectId` | Видалення |
| **Sprints** |
| GET  | `/workspaces/:workspaceId/projects/:projectId/sprints` | Список спринтів (пагінація) |
| GET  | `.../sprints/:sprintId` | Один спринт |
| POST | `.../sprints` | Створення спринту |
| PATCH| `.../sprints/:sprintId` | Оновлення |
| DELETE | `.../sprints/:sprintId` | Видалення |
| **Tasks** |
| GET  | `/workspaces/:workspaceId/projects/:projectId/tasks` | Список завдань (пагінація) |
| GET  | `.../tasks/:taskId` | Одне завдання |
| POST | `.../tasks` | Створення завдання |
| PATCH| `.../tasks/:taskId` | Оновлення |
| DELETE | `.../tasks/:taskId` | Видалення |
| **Participants** |
| GET  | `/workspaces/:workspaceId/participants` | Учасники workspace (пагінація) |
| GET  | `.../participants/:participantId` | Один учасник |
| POST | `.../participants` | Додати учасника |
| PATCH| `.../participants/:participantId` | Змінити роль |
| DELETE | `.../participants/:participantId` | Видалити з workspace |
| **Tags** |
| GET  | `/workspaces/:workspaceId/tags` | Список тегів (пагінація) |
| POST | `.../tags` | Створення тегу |
| DELETE | `.../tags/:tagId` | Видалення тегу |
| **Comments** |
| GET  | `.../tasks/:taskId/comments` | Коментарі завдання (пагінація) |
| GET  | `.../comments/:commentId` | Один коментар |
| POST | `.../comments` | Додати коментар |
| PATCH| `.../comments/:commentId` | Редагувати |
| DELETE | `.../comments/:commentId` | Видалити |
| **Logs** |
| Відповідно до реалізації в `logs.controller.ts` (зазвичай отримання логів по task) |

Точний перелік ендпоінтів, тіла запитів та відповідей дивіться у Swagger: `/api`.

---

## Автентифікація

- **Реєстрація:** `POST /auth/register` — створює користувача (username, email, fullname, password); пароль хешується (bcrypt).
- **Вхід:** `POST /auth/login` — перевірка облікових даних; у відповіді видається JWT.
- **Профіль:** `GET /auth` — повертає дані поточного користувача (без пароля).
- **Редагування профілю:** `PATCH /auth/profile` — оновлення власних даних. Тіло запиту (усі поля опційні): `fullname`, `position`, `email`, `newPassword`. При зміні email перевіряється унікальність; новий пароль хешується.
- **Захист маршрутів:** глобальний `AuthGuard` перевіряє JWT; маршрути з декоратором `@Public()` (наприклад, login, register) — без токена.
- **Ролі в workspace:** `WorkspaceAdminGuard` обмежує зміни (наприклад, оновлення/видалення workspace, проєктів) лише учасникам з роллю Admin.

У запитах до захищених ендпоінтів потрібен заголовок:

```http
Authorization: Bearer <JWT>
```

---

## Пагінація та сортування

Усі спискові GET-ендпоінти приймають query-параметри з `PaginationDto` і повертають однаковий формат.

### Query-параметри

| Параметр | Тип | За замовчуванням | Опис |
|----------|-----|-------------------|------|
| `page`   | number | 1  | Номер сторінки |
| `limit`  | number | 10 | Розмір сторінки (обмеження, напр. до 100) |
| `sortBy` | string | залежить від ресурсу | Поле для сортування (білий список по сутності) |
| `order`  | `asc` \| `desc` | залежить від ресурсу | Напрямок сортування |

### Формат відповіді списків

```json
{
  "data": [ /* масив елементів */ ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

Допустимі значення `sortBy` для кожного ресурсу описані в Swagger (наприклад, для workspace: `name`, `createdAt`, `updatedAt`; для task: `title`, `createdAt`, `updatedAt` тощо).

---

## Документація Swagger

Після запуску додатку інтерактивна документація OpenAPI доступна за адресою:

- **URL:** [http://localhost:3000/api](http://localhost:3000/api)

У Swagger можна:

- Переглядати всі маршрути, параметри та схеми;
- Відправляти запити (включно з Bearer-токеном після логіну);
- Переглядати описи `page`, `limit`, `sortBy`, `order` для спискових ендпоінтів.

---

## Скрипти

| Команда | Опис |
|---------|------|
| `npm run build` | Збірка (output у `dist/`) |
| `npm run start` | Запуск зі зібраного коду |
| `npm run start:dev` | Запуск у режимі watch (розробка) |
| `npm run start:debug` | Запуск з debug (watch) |
| `npm run start:prod` | Запуск production: `node dist/main` |
| `npm run lint` | ESLint з автофіксом |
| `npm run format` | Prettier для `src` та `test` |
| `npm run test` | Юніт-тести (Jest) |
| `npm run test:e2e` | E2E-тести |

Prisma (виконувати вручну за потреби):

- `npx prisma migrate dev` — міграції в режимі розробки
- `npx prisma generate` — генерація клієнта після зміни схеми
- `npx prisma studio` — веб-інтерфейс для перегляду/редагування даних

---

## Архітектура

- **Модулі NestJS:** кожен домен (auth, users, workspaces, projects, tasks, sprints, participants, tags, comments, logs) оформлений як окремий модуль з controller та service; залежності підключаються через `imports` у `AppModule`.
- **Repository-шар:** доступ до БД інкапсульований у репозиторіях (наприклад, `WorkspaceRepository`, `TaskRepository`), які використовують Prisma; сервіси викликають репозиторії та реалізують бізнес-логіку (перевірка існування workspace/project, валідація спринтів, призначення на завдання тощо).
- **DTO та валідація:** для create/update використовуються DTO з class-validator; глобальний `ValidationPipe` перетворює та валідує тіло запиту.
- **Обробка помилок:** `AllExceptionsFilter` перехоплює виключення та повертає єдиний формат помилок клієнту.
- **Пагінація:** у сервісах спискові методи отримують `PaginationDto`, формують `skip`, `take`, `orderBy` для Prisma, виконують `findMany` та `count` паралельно (`Promise.all`), повертають `{ data, meta }`.

Така структура спрощує підтримку, тестування та подальше розширення (наприклад, додавання нових модулів або зміну правил доступу).

---

## Ліцензія

UNLICENSED (приватний проєкт). Деталі — у `package.json` та репозиторії.

---

*README оновлено для проєкту Project Management API (NestJS, Prisma, PostgreSQL, Redis).*
