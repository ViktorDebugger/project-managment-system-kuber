$ErrorActionPreference = "Stop"
$ImagePrefix = "project-managment"

if (-not (minikube status 2>$null)) {
    Write-Host "Minikube is not running. Start with: minikube start"
    exit 1
}

Invoke-Expression (minikube docker-env | Out-String)
Write-Host "Building images using Minikube Docker daemon..."

docker build -t "${ImagePrefix}/user-auth:latest" -f services/user-auth/Dockerfile .
docker build -t "${ImagePrefix}/workspace:latest" -f services/workspace/Dockerfile .
docker build -t "${ImagePrefix}/project-task:latest" -f services/project-task/Dockerfile .
docker build -t "${ImagePrefix}/api-gateway:latest" -f services/api-gateway/Dockerfile .

Write-Host "All images built successfully."
