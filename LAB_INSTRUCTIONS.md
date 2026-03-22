# Інструкції для виконання лабораторних робіт (Windows)

Покрокові команди для виконання всіх завдань лабораторних робіт №4–6 з мікросервісною архітектурою, кешуванням, Docker та Kubernetes.

---

## Передумови

- **Node.js** 18+
- **Docker Desktop** (Windows)
- **Minikube** (для Kubernetes)
- **kubectl** (Kubernetes CLI)
- **PowerShell** або **Windows Terminal**

---

## Частина 1. Декомпозиція моноліту та мікросервіси

### 1.1 Огляд архітектури

Система складається з **4 сервісів**:

| Сервіс      | Порт | Відповідальність                    |
|-------------|------|-------------------------------------|
| api-gateway | 3000 | Єдина точка входу, проксування      |
| user-auth   | 3001 | Користувачі, аутентифікація         |
| workspace   | 3002 | Робочі простори, учасники, теги     |
| project-task| 3003 | Проєкти, спринти, задачі, коментарі |

### 1.2 Запуск локально (без Docker)

```powershell
# 1. Клонування та конфігурація
cd project-managment
copy .env.example .env

# 2. Запуск баз даних і Redis
docker-compose up -d user_db workspace_db project_task_db redis

# 3. Збірка спільного пакету
npm run build -w packages/shared

# 4. User-auth (термінал 1)
cd services/user-auth
copy .env.example .env
npx prisma migrate dev
npx prisma generate
npm run start:dev

# 5. Workspace (термінал 2)
cd services/workspace
copy .env.example .env
npx prisma migrate dev
npx prisma generate
npm run start:dev

# 6. Project-task (термінал 3)
cd services/project-task
copy .env.example .env
npx prisma migrate dev
npx prisma generate
npm run start:dev

# 7. API Gateway (термінал 4)
cd services/api-gateway
copy .env.example .env
npm run start:dev
```

### 1.3 Перевірка міжсервісної взаємодії (E2E-тест)

```powershell
# Запустити систему (Docker або локально), потім:
npm run test:e2e

# Або з автоматичним підняттям Docker:
npm run test:e2e:docker
```

### 1.4 Імітація недоступності сервісу

```powershell
# Запустити docker-compose
docker-compose up -d

# Зупинити user-auth
docker-compose stop user-auth

# Спробувати POST http://localhost:3000/auth/login — отримаєте 502 Bad Gateway

# Запустити знову
docker-compose start user-auth
```

---

## Частина 2. Кешування та контейнеризація

### 2.1 Кешування (Redis)

Кешування реалізовано в **workspace** для `GET /workspaces/:workspaceId`.

**Перевірка роботи кешу:**

```powershell
# 1. Запустити систему
docker-compose up -d --build

# 2. Реєстрація
$body = '{"username":"testuser","email":"test@example.com","fullname":"Test User","password":"password123"}'
Invoke-RestMethod -Uri "http://localhost:3000/auth/register" -Method Post -ContentType "application/json" -Body $body

# 3. Логін
$login = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"test@example.com","password":"password123"}'
$TOKEN = $login.access_token

# 4. Створення workspace
$headers = @{ Authorization = "Bearer $TOKEN" }
$ws = Invoke-RestMethod -Uri "http://localhost:3000/workspaces" -Method Post -ContentType "application/json" -Headers $headers -Body '{"name":"Test WS","description":"Test"}'
$workspaceId = $ws.id

# 5. Перший виклик (без кешу) — час відповіді більший
Measure-Command { Invoke-RestMethod -Uri "http://localhost:3000/workspaces/$workspaceId" -Headers $headers }

# 6. Повторний виклик (з кешу) — час відповіді менший
Measure-Command { Invoke-RestMethod -Uri "http://localhost:3000/workspaces/$workspaceId" -Headers $headers }
```

### 2.2 Docker — збірка образів

```powershell
# Збірка всіх образів
docker build -t project-managment/user-auth:latest -f services/user-auth/Dockerfile .
docker build -t project-managment/workspace:latest -f services/workspace/Dockerfile .
docker build -t project-managment/project-task:latest -f services/project-task/Dockerfile .
docker build -t project-managment/api-gateway:latest -f services/api-gateway/Dockerfile .
```

### 2.3 Docker Compose — повний запуск

```powershell
# Запуск усіх сервісів (БД, Redis, 4 мікросервіси)
docker-compose up -d --build

# Перегляд логів
docker-compose logs -f

# Зупинка
docker-compose down
```

### 2.4 Перевірка в контейнерах

```powershell
# Статус контейнерів
docker-compose ps

# Перевірка API
Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -ContentType "application/json" -Body '{}'

# Redis (через workspace)
docker-compose exec redis redis-cli ping
```

---

## Частина 3. Kubernetes (Minikube)

### 3.1 Встановлення Minikube (якщо ще немає)

```powershell
# Через Chocolatey
choco install minikube kubernetes-cli

# Або завантажити з https://minikube.sigs.k8s.io/docs/start/
```

### 3.2 Запуск кластера

```powershell
# Запуск Minikube
minikube start

# Перевірка статусу
minikube status

# Підключення Docker до Minikube (обов'язково перед збіркою!)
minikube docker-env | Invoke-Expression
```

### 3.3 Збірка образів для Minikube

```powershell
# Після minikube docker-env:
.\scripts\k8s-build.ps1

# Або вручну:
docker build -t project-managment/user-auth:latest -f services/user-auth/Dockerfile .
docker build -t project-managment/workspace:latest -f services/workspace/Dockerfile .
docker build -t project-managment/project-task:latest -f services/project-task/Dockerfile .
docker build -t project-managment/api-gateway:latest -f services/api-gateway/Dockerfile .
```

### 3.4 Secret

Secret задано в `k8s/secret.yaml` і застосовується скриптом deploy. Для production змініть `JWT_SECRET` та паролі в цьому файлі.

### 3.5 Деплой в Kubernetes

```powershell
.\scripts\k8s-deploy.ps1

# Або вручну (Makefile — якщо встановлений make):
# make deploy
```

### 3.6 Перевірка доступності

```powershell
# Статус подів
kubectl get pods -n project-management

# Сервіси
kubectl get svc -n project-management

# Проброс порту (якщо NodePort недоступний)
kubectl port-forward -n project-management svc/api-gateway 3000:3000
```

### 3.7 Доступ через NodePort (api-gateway: 30000)

```powershell
$BASE_URL = "http://$(minikube ip):30000"

# Перевірка
Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body '{}'

# Або відкрити в браузері
minikube service api-gateway -n project-management
```

### 3.8 Масштабування

```powershell
# Збільшити репліки api-gateway до 4
kubectl scale deployment api-gateway --replicas=4 -n project-management

# Перевірка подів
kubectl get pods -n project-management -l app=api-gateway
```

### 3.9 Поведінка при видаленні Pod-а

```powershell
# Список подів api-gateway
kubectl get pods -n project-management -l app=api-gateway

# Видалити один под
kubectl delete pod <pod-name> -n project-management

# Kubernetes автоматично створить новий под; сервіс залишається доступним
```

### 3.10 Rolling Update

```powershell
# 1. Підключити Docker до Minikube
minikube docker-env | Invoke-Expression

# 2. Зібрати новий образ з тегом v2
docker build -t project-managment/user-auth:v2 -f services/user-auth/Dockerfile .

# 3. Оновити Deployment
kubectl set image deployment/user-auth user-auth=project-managment/user-auth:v2 -n project-management

# 4. Слідкувати за оновленням
kubectl rollout status deployment/user-auth -n project-management

# 5. Відкат (якщо потрібно)
kubectl rollout undo deployment/user-auth -n project-management
```

### 3.11 Redis в Kubernetes

```powershell
# Перевірка Redis
kubectl exec -n project-management deployment/redis -- redis-cli ping

# Ключі кешу
kubectl exec -n project-management deployment/redis -- redis-cli keys '*'
```

### 3.12 Очищення (clean)

```powershell
# Видалити всі ресурси з namespace
kubectl delete -f k8s/api-gateway.yaml --ignore-not-found
kubectl delete -f k8s/project-task.yaml --ignore-not-found
kubectl delete -f k8s/workspace.yaml --ignore-not-found
kubectl delete -f k8s/user-auth.yaml --ignore-not-found
kubectl delete -f k8s/redis.yaml --ignore-not-found
kubectl delete -f k8s/project-task-db.yaml --ignore-not-found
kubectl delete -f k8s/workspace-db.yaml --ignore-not-found
kubectl delete -f k8s/user-db.yaml --ignore-not-found
kubectl delete -f k8s/configmap.yaml --ignore-not-found
kubectl delete -f k8s/secret.yaml --ignore-not-found
kubectl delete -f k8s/namespace.yaml --ignore-not-found

# Зупинити Minikube
minikube stop
```

---

## Швидкий довідник команд

| Дія | Команда |
|-----|---------|
| Docker Compose — запуск | `docker-compose up -d --build` |
| Docker Compose — зупинка | `docker-compose down` |
| E2E-тест | `npm run test:e2e` |
| Minikube — старт | `minikube start` |
| Minikube — Docker env | `minikube docker-env \| Invoke-Expression` |
| K8s — збірка образів | `.\scripts\k8s-build.ps1` |
| K8s — деплой | `.\scripts\k8s-deploy.ps1` |
| K8s — поди | `kubectl get pods -n project-management` |
| K8s — масштабування | `kubectl scale deployment api-gateway --replicas=4 -n project-management` |
| K8s — rolling update | `kubectl set image deployment/user-auth user-auth=project-managment/user-auth:v2 -n project-management` |

---

## Порти та бази даних

| Компонент | Порт | База/Схема |
|-----------|------|------------|
| api-gateway | 3000 | — |
| user-auth | 3001 | user_auth_db (PostgreSQL) |
| workspace | 3002 | workspace_db (PostgreSQL), Redis |
| project-task | 3003 | project_task_db (PostgreSQL) |
| Redis | 6379 | — |
| user_db | 5435 (host) | user_auth_db |
| workspace_db | 5436 (host) | workspace_db |
| project_task_db | 5437 (host) | project_task_db |

---

## Демонстраційний сценарій

1. **Реєстрація:** `POST /auth/register` → отримати JWT
2. **Логін:** `POST /auth/login` → токен
3. **Створення workspace:** `POST /workspaces` з токеном
4. **Додавання participant:** `POST /workspaces/:id/participants`
5. **Створення проєкту:** `POST /workspaces/:id/projects`
6. **Створення задачі:** `POST /workspaces/:id/projects/:id/tasks` (з assignees, tags — міжсервісна взаємодія)
7. **Кеш:** два `GET /workspaces/:id` — порівняти час відповіді
8. **Недоступність:** зупинити user-auth → спробувати логін → 502
9. **K8s масштабування:** `kubectl scale` → перевірити балансування
10. **Rolling update:** оновити образ → перевірити роботу під оновленням
