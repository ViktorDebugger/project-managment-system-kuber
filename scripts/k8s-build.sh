#!/usr/bin/env bash
set -e
IMAGE_PREFIX="project-managment"

if ! minikube status &>/dev/null; then
  echo "Minikube is not running. Start with: minikube start"
  exit 1
fi

eval $(minikube docker-env)
echo "Building images using Minikube Docker daemon..."

docker build -t "${IMAGE_PREFIX}/user-auth:latest" -f services/user-auth/Dockerfile .
docker build -t "${IMAGE_PREFIX}/workspace:latest" -f services/workspace/Dockerfile .
docker build -t "${IMAGE_PREFIX}/project-task:latest" -f services/project-task/Dockerfile .
docker build -t "${IMAGE_PREFIX}/api-gateway:latest" -f services/api-gateway/Dockerfile .

echo "All images built successfully."
