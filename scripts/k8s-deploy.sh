#!/usr/bin/env bash
set -e
K8S_DIR="k8s"
NAMESPACE="project-management"

echo "Applying manifests in order..."
kubectl apply -f "${K8S_DIR}/namespace.yaml"
kubectl apply -f "${K8S_DIR}/secret.yaml"
kubectl apply -f "${K8S_DIR}/configmap.yaml"
kubectl apply -f "${K8S_DIR}/user-db.yaml"
kubectl apply -f "${K8S_DIR}/workspace-db.yaml"
kubectl apply -f "${K8S_DIR}/project-task-db.yaml"
kubectl apply -f "${K8S_DIR}/redis.yaml"
kubectl apply -f "${K8S_DIR}/user-auth.yaml"
kubectl apply -f "${K8S_DIR}/workspace.yaml"
kubectl apply -f "${K8S_DIR}/project-task.yaml"
kubectl apply -f "${K8S_DIR}/api-gateway.yaml"

echo ""
echo "Deployment complete. Waiting for pods to be Ready..."
kubectl wait --for=condition=Ready pods --all -n "${NAMESPACE}" --timeout=300s 2>/dev/null || true
echo ""
kubectl get pods -n "${NAMESPACE}"
