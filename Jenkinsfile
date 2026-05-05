pipeline {
    agent any

    environment {
        IMAGE_BACKEND  = 'buyeasy-backend'
        IMAGE_FRONTEND = 'buyeasy-frontend'
    }

    tools {
        nodejs 'NodeJS-18'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '📦 Checking out source code...'
                deleteDir()            // 🔥 IMPORTANT: clears old workspace
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                echo '📦 Installing backend dependencies...'
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                echo '📦 Installing frontend dependencies...'
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Backend Tests') {
            steps {
                echo '🧪 Running backend tests...'
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building backend Docker image...'
                sh "docker build -t ${IMAGE_BACKEND}:latest -f backend/Dockerfile ."

                echo '🐳 Building frontend Docker image...'
                sh "docker build -t ${IMAGE_FRONTEND}:latest ./frontend"
            }
        }

        stage('Run Containers') {
            steps {
                echo '🚀 Starting application containers...'

                // Inject .env securely
                withCredentials([file(credentialsId: 'buyeasy-backend-env', variable: 'ENV_FILE')]) {
                    sh 'rm -f backend/.env && cp $ENV_FILE backend/.env'
                }

                // Clean old containers
                sh 'docker rm -f buyeasy-backend buyeasy-frontend 2>/dev/null || true'

                // Start fresh containers
                sh 'docker-compose -p buyeasy down --remove-orphans || true'
                sh 'docker-compose -p buyeasy up -d --no-build'

                sh 'sleep 10'
                sh 'docker ps'
            }
        }
    }

    post {
        success {
            echo '''
╔══════════════════════════════════════╗
║   ✅ PIPELINE SUCCESSFUL             ║
║   Frontend: http://localhost:3000    ║
║   Backend:  http://localhost:5000    ║
╚══════════════════════════════════════╝
            '''
        }
        failure {
            echo '❌ Pipeline failed. Check the stage logs above.'
        }
        always {
            echo '🧹 Pipeline finished.'
        }
    }
```
