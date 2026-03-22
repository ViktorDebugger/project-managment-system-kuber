# Демонстраційний сценарій — Розгортання мікросервісної системи в Kubernetes

Сценарій для отримання скріншотів до звіту з лабораторної роботи. Команди для Windows PowerShell.

---

## Підготовка

Переконатися, що встановлено: Minikube, kubectl, Docker Desktop. Відкрити PowerShell у кореневій папці проєкту.

---

## Частина 1. Запуск Minikube (Завдання 1)

| Крок | Команда | Скріншот | Підпис |
|------|---------|----------|--------|
| 1.1 | `minikube start` | Термінал з успішним запуском | Запуск локального Kubernetes-кластера (Minikube) |
| 1.2 | `minikube status` | Вивід статусу | Перевірка стану кластера Minikube |

---

## Частина 2. Збірка образів та розгортання (Завдання 2, 3)

| Крок | Команда | Скріншот | Підпис |
|------|---------|----------|--------|
| 2.1 | `minikube docker-env &#124; Invoke-Expression` | Термінал після виконання | Підключення Docker до Minikube |
| 2.2 | `docker ps` | Список контейнерів Minikube | Перевірка роботи Docker через Minikube |
| 2.3 | `.\scripts\k8s-build.ps1` | Вивід збірки 4 образів | Збірка Docker-образів для сервісів |
| 2.4 | `.\scripts\k8s-deploy.ps1` | Вивід kubectl apply та очікування pods | Застосування Deployment, Service, PVC |
| 2.5 | `kubectl get pods -n project-management` | Список pods (усі Running) | Список Pod-ів після розгортання |
| 2.6 | `kubectl get svc -n project-management` | Список Service | Service для доступу до сервісів |
| 2.7 | `kubectl get pods -n project-management -l app=api-gateway` | 2 репліки api-gateway | Мінімум 2 репліки api-gateway |

---

## Частина 3. Перевірка доступності (Завдання 4)

Відкрити другий термінал PowerShell. У ньому запустити і не закривати:

```powershell
kubectl port-forward -n project-management svc/api-gateway 3000:3000
```

Далі у першому терміналі (або третьому):

| Крок | Команда | Скріншот | Підпис |
|------|---------|----------|--------|
| 3.1 | `$BASE_URL = "http://localhost:3000"` | — | Змінна для URL (port-forward) |
| 3.2 | `Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body '{}'` | Відповідь з помилкою валідації (400) | Перевірка доступності /auth/login |
| 3.3 | `Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" -Body '{"username":"testuser","email":"test@example.com","fullname":"Test User","password":"password123"}'` | Відповідь 201 з об'єктом користувача | Реєстрація користувача |
| 3.4 | `$login = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"test@example.com","password":"password123"}'` | Відповідь з access_token | Отримання JWT токена |
| 3.5 | `$TOKEN = $login.access_token` | — | Збереження токена |
| 3.6 | `Invoke-RestMethod -Uri "$BASE_URL/workspaces" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $TOKEN"} -Body '{"name":"Test WS"}'` | Відповідь 201 з об'єктом workspace | Міжсервісна взаємодія: створення workspace |
| 3.7 | `kubectl exec -n project-management deployment/redis -- redis-cli ping` | Вивід `PONG` | Перевірка підключення до Redis |

---

## Частина 4. Масштабування (Завдання 5)

| Крок | Команда | Скріншот | Підпис |
|------|---------|----------|--------|
| 4.1 | `kubectl scale deployment api-gateway --replicas=4 -n project-management` | Вивід `deployment.apps/api-gateway scaled` | Збільшення реплік api-gateway до 4 |
| 4.2 | `kubectl get pods -n project-management -l app=api-gateway` | 4 Pod-и в статусі Running | Результат масштабування |
| 4.3 | `Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body '{}'` (3–5 разів) | Кілька успішних відповідей | Перевірка балансування навантаження |

---

## Частина 5. Видалення Pod-а (Завдання 6)

| Крок | Команда | Скріншот | Підпис |
|------|---------|----------|--------|
| 5.1 | `kubectl get pods -n project-management -l app=api-gateway` | Список Pod-ів з їх іменами | Стан перед видаленням |
| 5.2 | `kubectl delete pod <pod-name> -n project-management` | Підставити ім'я з попереднього кроку, наприклад: `kubectl delete pod api-gateway-7c95fd58b7-4k6pk -n project-management` | Вивід `pod "..." deleted` | Видалення одного Pod-а |
| 5.3 | `try { Invoke-WebRequest -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body '{}' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }` | Вивід `400` | Доступність API після видалення Pod-а |
| 5.4 | `kubectl get pods -n project-management -l app=api-gateway` | Нові Pod-и (один створюється замість видаленого) | Відновлення Pod-ів Deployment-ом |

---

## Частина 6. Rolling Update (Завдання 7)

| Крок | Команда | Скріншот | Підпис |
|------|---------|----------|--------|
| 6.1 | `minikube docker-env &#124; Invoke-Expression` | — | Підключення Docker до Minikube |
| 6.2 | `docker build -t project-managment/user-auth:v2 -f services/user-auth/Dockerfile .` | Успішна збірка образу v2 | Збірка нового образу user-auth |
| 6.3 | `kubectl set image deployment/user-auth user-auth=project-managment/user-auth:v2 -n project-management` | Вивід `image updated` | Оновлення Deployment на v2 |
| 6.4 | `kubectl rollout status deployment/user-auth -n project-management` | Вивід `successfully rolled out` | Моніторинг Rolling Update |
| 6.5 | `kubectl rollout history deployment/user-auth -n project-management` | Таблиця ревізій | Історія ревізій Deployment |

---

## Частина 7. Відкат (опціонально)

| Крок | Команда | Скріншот | Підпис |
|------|---------|----------|--------|
| 7.1 | `kubectl rollout undo deployment/user-auth -n project-management` | Вивід `deployment "user-auth" rolled back` | Відкат до попередньої версії |

---

## Структура скріншотів для звіту

| № | Розділ звіту | Рекомендований скріншот |
|---|--------------|-------------------------|
| 1 | Реалізація | Частина 1.2 — Minikube status |
| 2 | Реалізація | Частина 2.5 — Pod-и після deploy |
| 3 | Реалізація | Частина 2.6 — Service |
| 4 | Тестування — доступність | Частина 3.2 або 3.6 |
| 5 | Тестування — міжсервісна взаємодія | Частина 3.6 |
| 6 | Тестування — Redis | Частина 3.7 |
| 7 | Тестування — масштабування | Частини 4.1–4.2 |
| 8 | Тестування — видалення Pod-а | Частини 5.2, 5.3, 5.4 |
| 9 | Реалізація — rolling update | Частини 6.3, 6.4 |
| 10 | Реалізація | Частина 6.5 — історія ревізій |

---

## Підписи до зображень (для звіту)

1. Рис. 1 — Запуск локального Kubernetes-кластера (Minikube)
2. Рис. 2 — Список Pod-ів після розгортання системи
3. Рис. 3 — Список Service для доступу до сервісів
4. Рис. 4 — Перевірка доступності API (auth/login)
5. Рис. 5 — Міжсервісна взаємодія: реєстрація → логін → створення workspace
6. Рис. 6 — Перевірка підключення до Redis (redis-cli ping)
7. Рис. 7 — Масштабування api-gateway до 4 реплік
8. Рис. 8 — Видалення Pod-а та відновлення Deployment-ом
9. Рис. 9 — Rolling update сервісу user-auth до версії v2
10. Рис. 10 — Історія ревізій Deployment (rollout history)

---

## Примітки для Windows

- У PowerShell `curl` — це аліас для `Invoke-WebRequest`; для HTTP-запитів краще використовувати `Invoke-RestMethod` або `Invoke-WebRequest`.
- `$BASE_URL` зберігається в поточній сесії PowerShell; при закритті терміналу потрібно задати знову.
- Port-forward (`kubectl port-forward`) має працювати у окремому терміналі; при його закритті доступ через localhost:3000 зникає.
