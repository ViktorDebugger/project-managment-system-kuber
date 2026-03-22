# Kubernetes Deployment

## Minikube Setup

### Installation (if not installed)

**Windows (PowerShell):**
```powershell
winget install minikube
# or with Chocolatey: choco install minikube
```

**Windows (manual):**
Download `minikube-installer.exe` from [minikube releases](https://github.com/kubernetes/minikube/releases) and run it.

**Linux/macOS:**
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
install minikube-linux-amd64 /usr/local/bin/minikube
```

### Start Minikube

```bash
minikube start
minikube status
```

### Use Minikube Docker daemon (for local images)

```bash
eval $(minikube docker-env)
```

On Windows PowerShell:
```powershell
minikube docker-env | Invoke-Expression
```

### Build Images

**Makefile (run `eval $(minikube docker-env)` first):**
```bash
make build
```

**Script (auto-configures Minikube Docker daemon):**
```bash
./scripts/k8s-build.sh
# or: bash scripts/k8s-build.sh
```
Windows PowerShell:
```powershell
.\scripts\k8s-build.ps1
```

**Manual:**
```bash
eval $(minikube docker-env)
docker build -t project-managment/user-auth:latest -f services/user-auth/Dockerfile .
docker build -t project-managment/workspace:latest -f services/workspace/Dockerfile .
docker build -t project-managment/project-task:latest -f services/project-task/Dockerfile .
docker build -t project-managment/api-gateway:latest -f services/api-gateway/Dockerfile .
```

---

## Apply Order

1. **Namespace**
2. **Secret, ConfigMap** (no dependencies)
3. **PVC + DB/Redis** (user-db, workspace-db, project-task-db, redis — each file includes PVC)
4. **Application services** (user-auth → workspace → project-task → api-gateway)

**Makefile:**
```bash
make deploy
```

**Script:**
```bash
./scripts/k8s-deploy.sh
```
Windows PowerShell:
```powershell
.\scripts\k8s-deploy.ps1
```

**Manual kubectl apply:**
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/user-db.yaml
kubectl apply -f k8s/workspace-db.yaml
kubectl apply -f k8s/project-task-db.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/user-auth.yaml
kubectl apply -f k8s/workspace.yaml
kubectl apply -f k8s/project-task.yaml
kubectl apply -f k8s/api-gateway.yaml
```

---

## Verify Pods Are Running

```bash
kubectl get pods -n project-management
```

All pods should show `STATUS: Running` and `READY: 1/1` (or `2/2` for api-gateway replicas).

**Wait until all are Ready:**
```bash
kubectl wait --for=condition=Ready pods --all -n project-management --timeout=300s
```

**Check pod status in detail:**
```bash
kubectl get pods -n project-management -o wide
kubectl describe pods -n project-management
```

**View logs if a pod is not starting:**
```bash
kubectl logs -n project-management -l app=api-gateway --tail=50
```

**Full verification (availability, inter-service, Redis, pod failure recovery):** see [k8s/VERIFICATION.md](VERIFICATION.md)

**Rolling update (user-auth example):** see [k8s/ROLLING_UPDATE.md](ROLLING_UPDATE.md)

---

### Access api-gateway (NodePort 30000)

```bash
minikube service api-gateway -n project-management
```

Or get the Minikube IP and use `http://<minikube-ip>:30000`.

For ephemeral dev (no data persistence), replace PVC in each DB/Redis manifest with:
```yaml
volumes:
  - name: data
    emptyDir: {}
```

---

## Service DNS Names

| Service | K8s DNS | Port |
|---------|---------|------|
| user-db | `user-db.project-management.svc.cluster.local` | 5432 |
| workspace-db | `workspace-db.project-management.svc.cluster.local` | 5432 |
| project-task-db | `project-task-db.project-management.svc.cluster.local` | 5432 |
| redis | `redis.project-management.svc.cluster.local` | 6379 |
| user-auth | `user-auth.project-management.svc.cluster.local` | 3001 |
| workspace | `workspace.project-management.svc.cluster.local` | 3002 |
| project-task | `project-task.project-management.svc.cluster.local` | 3003 |
| api-gateway | `api-gateway.project-management.svc.cluster.local` | 3000 |

Within the same namespace, short names work: `user-db:5432`, `redis:6379`, etc.

---

## Security Note

Before deploying to a non-dev environment, update `secret.yaml` with strong values for `JWT_SECRET` and `POSTGRES_PASSWORD`. Consider using sealed-secrets or an external secret manager for production.
