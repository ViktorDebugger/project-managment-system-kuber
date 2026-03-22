# Kubernetes Verification Guide

## 1. Get api-gateway URL

### Option A: minikube service (opens browser or prints URL)

```bash
minikube service api-gateway -n project-management
```

This opens the browser or prints the URL (e.g. `http://192.168.49.2:30000`).

### Option B: Get Minikube IP and use NodePort directly

```bash
minikube ip
```

Then open: `http://<minikube-ip>:30000`

Example: `http://192.168.49.2:30000`

### Option C: kubectl port-forward (if NodePort is not reachable)

```bash
kubectl port-forward -n project-management svc/api-gateway 3000:3000
```

Then open: `http://localhost:3000`

---

## 2. Verify Availability: /auth/login

The `/auth/login` endpoint is public and accepts POST. A POST with empty or invalid body returns 400, which confirms api-gateway and user-auth are reachable.

```bash
BASE_URL="http://$(minikube ip):30000"

curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{}'
```

Expected: JSON error (400 Bad Request) — confirms api-gateway and user-auth are reachable.

Quick status code check:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{}'
```

Expected: `400`

---

## 3. Verify Inter-Service Interaction: Register → Login → Create Workspace

```bash
BASE_URL="http://$(minikube ip):30000"
```

### Step 1: Register

```bash
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "fullname": "Test User",
    "password": "password123"
  }'
```

Expected: `201` with user object (no password).

### Step 2: Login

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  | jq -r '.access_token')
echo "Token: $TOKEN"
```

Expected: JWT in `access_token`.

### Step 3: Create Workspace

```bash
WORKSPACE=$(curl -s -X POST "$BASE_URL/workspaces" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Test Workspace", "description": "K8s verification"}')
echo "$WORKSPACE"
```

Expected: `201` with workspace object. Save `id` for Redis check:

```bash
WORKSPACE_ID=$(echo "$WORKSPACE" | jq -r '.id')
echo "Workspace ID: $WORKSPACE_ID"
```

---

## 4. Verify Redis

### Option A: redis-cli inside Redis pod

```bash
kubectl exec -n project-management deployment/redis -- redis-cli ping
```

Expected: `PONG`

List keys (workspace cache uses keys like `workspace:${id}`):

```bash
kubectl exec -n project-management deployment/redis -- redis-cli keys '*'
```

### Option B: Confirm cache via GET /workspaces/:id (timing)

First call (cache miss, slower):

```bash
curl -s -o /dev/null -w "First GET time: %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/workspaces/$WORKSPACE_ID"
```

Second call (cache hit, faster):

```bash
curl -s -o /dev/null -w "Second GET time: %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/workspaces/$WORKSPACE_ID"
```

Second request should be noticeably faster (e.g. first ~50–100 ms, second ~5–15 ms).

### Option C: Check Redis keys after GET

```bash
kubectl exec -n project-management deployment/redis -- redis-cli keys 'workspace:*'
```

After at least one `GET /workspaces/:id`, you should see cache keys.

---

## 5. Verify Pod Failure Recovery (Delete api-gateway Pod)

With multiple replicas of api-gateway, deleting one Pod should not affect availability. The Deployment recreates the Pod, and the Service continues routing traffic to remaining replicas.

### Step 1: Verify availability before deletion

```bash
BASE_URL="http://$(minikube ip):30000"

curl -s -o /dev/null -w "Before delete: %{http_code}\n" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{}'
```

Expected: `400` (service is reachable).

### Step 2: List and delete one api-gateway Pod

```bash
kubectl get pods -n project-management -l app=api-gateway
```

Pick one Pod name (e.g. `api-gateway-7d8f9c-xyz12`) and delete it:

```bash
kubectl delete pod <pod-name> -n project-management
```

Example: `kubectl delete pod api-gateway-7d8f9c-xyz12 -n project-management`

### Step 3: What should happen

- The Deployment controller detects the Pod is gone and creates a new one.
- The Service continues routing traffic to the remaining replica(s).
- Requests during the brief gap (if only one replica was left) may retry or fail momentarily; with 2+ replicas, traffic shifts to the other pod(s) immediately.

### Step 4: Verify availability after deletion

```bash
curl -s -o /dev/null -w "After delete: %{http_code}\n" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{}'
```

Expected: `400` — requests succeed. Optionally run a few curl requests in a loop to confirm ongoing availability:

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{}'
  sleep 1
done
```

### Step 5: Confirm new Pod is Running

```bash
kubectl get pods -n project-management -l app=api-gateway
```

You should see the original count of replicas (e.g. 2), with one Pod in `Running` state and possibly one in `ContainerCreating` if it was just recreated.

---

## 6. Quick Verification Script

```bash
#!/bin/bash
set -e
BASE_URL="http://$(minikube ip):30000"
echo "Base URL: $BASE_URL"

echo "1. Availability check..."
curl -s -o /dev/null -w "auth/login: %{http_code}\n" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{}'

echo "2. Register + Login + Create Workspace..."
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d '{"username":"vuser","email":"v@e.com","fullname":"V","password":"pass123"}' > /dev/null
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"v@e.com","password":"pass123"}' | jq -r '.access_token')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && echo "Login OK"
WS=$(curl -s -X POST "$BASE_URL/workspaces" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" -d '{"name":"V WS"}')
echo "Workspace created: $(echo $WS | jq -r '.name')"

echo "3. Redis ping..."
kubectl exec -n project-management deployment/redis -- redis-cli ping
echo "Verification complete."
```
