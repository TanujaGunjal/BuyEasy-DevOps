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

        stage('Clean') {
            steps {
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                echo '📦 Checking out source code...'
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
                echo '🧪 Running backend tests + collecting coverage...'
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        // ✅ FIXED SONAR STAGE
        stage('SonarQube Analysis') {
            steps {
                echo '🔍 Running SonarQube analysis...'
                dir('backend') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh """
                        ${tool 'SonarScanner'}/bin/sonar-scanner \
                        -Dsonar.projectKey=buyeasy-backend \
                        -Dsonar.host.url=http://192.168.1.35:9000 \
                        -Dsonar.token=$SONAR_TOKEN
                        """
                    }
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

                // ── Tear down any running stack cleanly ────────────────────
                sh 'docker rm -f buyeasy-backend buyeasy-frontend buyeasy-prometheus buyeasy-grafana buyeasy-node-exporter 2>/dev/null || true'
                sh 'docker-compose -p buyeasy down --remove-orphans 2>/dev/null || true'

                // ── Inject backend env file ────────────────────────────────
                withCredentials([file(credentialsId: 'buyeasy-backend-env', variable: 'ENV_FILE')]) {
                    sh 'rm -f backend/.env && cp $ENV_FILE backend/.env'
                }

                // ── Start all active containers (Prometheus is disabled) ───
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
}