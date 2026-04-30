pipeline {
    agent none   // no global agent (we use different environments per stage)

    environment {
        IMAGE_BACKEND  = 'buyeasy-backend'
        IMAGE_FRONTEND = 'buyeasy-frontend'
    }

    stages {

        // ─────────────────────────────────────────────
        // Install dependencies using Node container
        // ─────────────────────────────────────────────
        stage('Install Dependencies') {
            agent {
                docker {
                    image 'node:18-alpine'
                }
            }
            steps {
                echo '📦 Installing dependencies...'
                dir('backend') {
                    sh 'npm install'
                }
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        // ─────────────────────────────────────────────
        // Run tests (Jest + Supertest)
        // ─────────────────────────────────────────────
        stage('Run Tests') {
            agent {
                docker {
                    image 'node:18-alpine'
                }
            }
            steps {
                echo '🧪 Running backend tests...'
                dir('backend') {
                    sh 'npm install'
                    sh 'npx jest --forceExit --detectOpenHandles'
                }
            }
        }

        // ─────────────────────────────────────────────
        // Build Docker images (runs on Jenkins host)
        // ─────────────────────────────────────────────
        stage('Build Docker Images') {
            agent any
            steps {
                echo '🐳 Building backend image...'
                sh "docker build -t ${IMAGE_BACKEND}:latest ./backend"

                echo '🐳 Building frontend image...'
                sh "docker build -t ${IMAGE_FRONTEND}:latest ./frontend"
            }
        }

        // ─────────────────────────────────────────────
        // Run containers
        // ─────────────────────────────────────────────
stage('Run Containers') {
    agent any
    steps {
        echo '🚀 Starting containers...'
        sh 'docker compose down --remove-orphans || true'
        sh 'docker compose up -d'
        sh 'docker ps'
    }
}
    }

    // ─────────────────────────────────────────────
    // Post actions
    // ─────────────────────────────────────────────
    post {
        success {
            echo '''
            ╔══════════════════════════════════════╗
            ║   ✅ PIPELINE SUCCESSFUL             ║
            ║   Frontend: http://localhost:3000   ║
            ║   Backend:  http://localhost:5000   ║
            ╚══════════════════════════════════════╝
            '''
        }
        failure {
            echo '❌ PIPELINE FAILED — check console output.'
        }
        always {
            echo '🧹 Pipeline finished.'
        }
    }
}