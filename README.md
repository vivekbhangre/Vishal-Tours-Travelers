# Application Deployment Guide

This repository contains the application source code along with Docker and Kubernetes configuration files for seamless deployment to a kubeadm cluster.

## Prerequisites
- **Docker** installed on your local machine or build server.
- **Kubernetes cluster** (kubeadm or similar) with `kubectl` configured.
- **Container Registry** access (e.g., Docker Hub, AWS ECR, or Google Artifact Registry) to host your pushed image.

## Step-by-Step Deployment Instructions

### 1. Build the Docker Image
From the root directory of the project, build the docker image. You will need to replace `your-registry-username` with your actual username or container registry URL.

```bash
docker build -t your-registry-username/my-app:v1 .
```

### 2. Push the Docker Image
Push the newly built image to your container registry so that your Kubernetes cluster's worker nodes can download and run it.

```bash
docker push your-registry-username/my-app:v1
```

### 3. Update the Kubernetes Manifest
Open the `k8s-deployment.yaml` file located in the root of the repository. Update the `image` field to exactly match the image tag you just pushed.

```yaml
    spec:
      containers:
      - name: my-app
        image: your-registry-username/my-app:v1  # <-- UPDATE THIS LINE
```

*Note: If your application relies on secrets (like `JWT_SECRET`), ensure you either mount Kubernetes Secrets or add them to the `env` list in the deployment YAML.*

### 4. Deploy to Kubernetes
Apply the deployment and service configuration to your kubeadm cluster.

```bash
kubectl apply -f k8s-deployment.yaml
```

### 5. Verify the Deployment
Check the status of your pods and the service to ensure everything started properly:

```bash
# Verify the pods are in the 'Running' state
kubectl get pods -l app=my-app

# Verify the service is active and bound to the NodePort
kubectl get svc my-app-service
```

### 6. Access the Application
The bundled service is configured as a `NodePort` on port `30080`. 
Find the IP address of any worker node in your kubeadm cluster and access the application in your browser:

```text
http://<NODE-IP>:30080
```
