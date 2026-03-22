# Rolling Update Guide

This guide describes how to update a service (e.g. user-auth) to a new version without downtime.

## 1. Deployment Strategy

Deployments should have `strategy: RollingUpdate` with `maxSurge` and `maxUnavailable`:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

- **maxSurge: 1** — allows one extra Pod above desired count during update
- **maxUnavailable: 0** — keeps all existing Pods running until new ones are ready

The user-auth Deployment already includes this strategy.

## 2. Rolling Update Process

### Step 1: Build new image with versioned tag

Use a version tag (e.g. v2) or timestamp instead of `latest` so the update is explicit:

```bash
eval $(minikube docker-env)

docker build -t project-managment/user-auth:v2 -f services/user-auth/Dockerfile .
```

Or with timestamp:

```bash
TAG="v$(date +%Y%m%d%H%M%S)"
docker build -t project-managment/user-auth:$TAG -f services/user-auth/Dockerfile .
```

### Step 2: Update the Deployment image

**Option A: kubectl set image**

```bash
kubectl set image deployment/user-auth \
  user-auth=project-managment/user-auth:v2 \
  -n project-management
```

With timestamp variable:

```bash
kubectl set image deployment/user-auth \
  user-auth=project-managment/user-auth:$TAG \
  -n project-management
```

**Option B: kubectl apply (edit YAML first)**

Update `image` in `k8s/user-auth.yaml` from `project-managment/user-auth:latest` to `project-managment/user-auth:v2`, then:

```bash
kubectl apply -f k8s/user-auth.yaml
```

### Step 3: Kubernetes performs the rolling update

- Creates a new Pod with the new image
- Waits for it to be Ready (readinessProbe)
- Terminates the old Pod
- Repeats if there are more replicas

## 3. Monitor the rollout

```bash
kubectl rollout status deployment/user-auth -n project-management
```

Expected output: `deployment "user-auth" successfully rolled out`

Watch Pods in real time:

```bash
kubectl get pods -n project-management -l app=user-auth -w
```

Check rollout history:

```bash
kubectl rollout history deployment/user-auth -n project-management
```

## 4. Rollback

If the new version has issues:

```bash
kubectl rollout undo deployment/user-auth -n project-management
```

Rollback to a specific revision:

```bash
kubectl rollout history deployment/user-auth -n project-management
kubectl rollout undo deployment/user-auth --to-revision=1 -n project-management
```

## 5. Apply to other services

Same process for workspace, project-task, api-gateway. All app Deployments already have `strategy: RollingUpdate`.

| Service      | Build command                                          | Set image                                                                 |
|--------------|--------------------------------------------------------|---------------------------------------------------------------------------|
| workspace    | `docker build -t project-managment/workspace:v2 -f services/workspace/Dockerfile .`   | `kubectl set image deployment/workspace workspace=project-managment/workspace:v2 -n project-management` |
| project-task | `docker build -t project-managment/project-task:v2 -f services/project-task/Dockerfile .`| `kubectl set image deployment/project-task project-task=project-managment/project-task:v2 -n project-management` |
| api-gateway  | `docker build -t project-managment/api-gateway:v2 -f services/api-gateway/Dockerfile .` | `kubectl set image deployment/api-gateway api-gateway=project-managment/api-gateway:v2 -n project-management` |
