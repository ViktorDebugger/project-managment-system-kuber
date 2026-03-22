.PHONY: minikube-env build build-user-auth build-workspace build-project-task build-api-gateway deploy status clean

IMAGE_PREFIX := project-managment
NAMESPACE := project-management
K8S_DIR := k8s

minikube-env:
	@echo "Run: eval \$$(minikube docker-env)"
	@echo "Windows PowerShell: minikube docker-env | Invoke-Expression"

build-user-auth:
	docker build -t $(IMAGE_PREFIX)/user-auth:latest -f services/user-auth/Dockerfile .

build-workspace:
	docker build -t $(IMAGE_PREFIX)/workspace:latest -f services/workspace/Dockerfile .

build-project-task:
	docker build -t $(IMAGE_PREFIX)/project-task:latest -f services/project-task/Dockerfile .

build-api-gateway:
	docker build -t $(IMAGE_PREFIX)/api-gateway:latest -f services/api-gateway/Dockerfile .

build: build-user-auth build-workspace build-project-task build-api-gateway
	@echo "All images built. Ensure minikube docker-env is active."

deploy:
	kubectl apply -f $(K8S_DIR)/namespace.yaml
	kubectl apply -f $(K8S_DIR)/secret.yaml
	kubectl apply -f $(K8S_DIR)/configmap.yaml
	kubectl apply -f $(K8S_DIR)/user-db.yaml
	kubectl apply -f $(K8S_DIR)/workspace-db.yaml
	kubectl apply -f $(K8S_DIR)/project-task-db.yaml
	kubectl apply -f $(K8S_DIR)/redis.yaml
	kubectl apply -f $(K8S_DIR)/user-auth.yaml
	kubectl apply -f $(K8S_DIR)/workspace.yaml
	kubectl apply -f $(K8S_DIR)/project-task.yaml
	kubectl apply -f $(K8S_DIR)/api-gateway.yaml

status:
	kubectl get pods -n $(NAMESPACE)
	kubectl get svc -n $(NAMESPACE)

clean:
	kubectl delete -f $(K8S_DIR)/api-gateway.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/project-task.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/workspace.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/user-auth.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/redis.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/project-task-db.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/workspace-db.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/user-db.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/configmap.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/secret.yaml --ignore-not-found
	kubectl delete -f $(K8S_DIR)/namespace.yaml --ignore-not-found
