$ErrorActionPreference = "Stop"
$K8sDir = "k8s"
$Namespace = "project-management"

Write-Host "Applying manifests in order..."
kubectl apply -f "${K8sDir}/namespace.yaml"
kubectl apply -f "${K8sDir}/secret.yaml"
kubectl apply -f "${K8sDir}/configmap.yaml"
kubectl apply -f "${K8sDir}/user-db.yaml"
kubectl apply -f "${K8sDir}/workspace-db.yaml"
kubectl apply -f "${K8sDir}/project-task-db.yaml"
kubectl apply -f "${K8sDir}/redis.yaml"
kubectl apply -f "${K8sDir}/user-auth.yaml"
kubectl apply -f "${K8sDir}/workspace.yaml"
kubectl apply -f "${K8sDir}/project-task.yaml"
kubectl apply -f "${K8sDir}/api-gateway.yaml"

Write-Host ""
Write-Host "Deployment complete. Waiting for pods..."
kubectl wait --for=condition=Ready pods --all -n $Namespace --timeout=300s 2>$null
Write-Host ""
kubectl get pods -n $Namespace
