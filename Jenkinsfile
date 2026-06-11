pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = "my-registry/my-app"
        DOCKER_TAG = "v${BUILD_NUMBER}"
    }

    stages {
        stage('Clone Repository') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    // Assuming you have a sonar-project.properties or you pass properties here
                    sh '''
                    npm install
                    npm run build
                    # Run Sonar scanner
                    sonar-scanner \
                      -Dsonar.projectKey=travel-booking-app \
                      -Dsonar.sources=src,server \
                      -Dsonar.host.url=$SONAR_HOST_URL \
                      -Dsonar.login=$SONAR_AUTH_TOKEN
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest ."
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                    sh """
                    echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                    docker push \${DOCKER_IMAGE}:\${DOCKER_TAG}
                    docker push \${DOCKER_IMAGE}:latest
                    """
                }
            }
        }

        stage('CD Deploy to Kubernetes') {
            steps {
                sh """
                # Update image tag in deployment
                sed -i "s|image: .*|image: \${DOCKER_IMAGE}:\${DOCKER_TAG}|g" k8s/deployment.yaml
                kubectl apply -f k8s/
                """
            }
        }
    }
}
