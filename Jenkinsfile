pipeline {
    agent any

    // ── Environment variables available in every stage ──────────────────────
    environment {
        IMAGE_BACKEND  = 'buyeasy-backend'
        IMAGE_FRONTEND = 'buyeasy-frontend'
        APP_PORT_BACK  = '5000'
        APP_PORT_FRONT = '3000'
    }

    stages {

        // ── Stage 1: Install Dependencies ─────────────────────────────────
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing backend dependencies...'
                dir('backend') {
                    sh 'npm install'
                }
                echo '📦 Installing frontend dependencies...'
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        // ── Stage 2: Run Tests (Jest + Supertest) ─────────────────────────
        stage('Run Tests') {
            steps {
                echo '🧪 Running backend tests with Jest...'
                dir('backend') {
                    // --forceExit closes the process even if DB mock keeps it alive
                    sh 'npx jest --forceExit --detectOpenHandles --coverage'
                }
            }
            post {
                failure {
                    echo '❌ Tests FAILED – pipeline will not build Docker image.'
                }
                success {
                    echo '✅ All tests PASSED!'
                }
            }
        }

        // ── Stage 3: Build Docker Images ──────────────────────────────────
        stage('Build Docker Images') {
            steps {
                echo '🐳 Building backend Docker image...'
                sh "docker build -t ${IMAGE_BACKEND}:latest ./backend"

                echo '🐳 Building frontend Docker image...'
                sh "docker build -t ${IMAGE_FRONTEND}:latest ./frontend"
            }
        }

        // ── Stage 4: Run Containers (docker-compose) ──────────────────────
        stage('Run Containers') {
            steps {
                echo '🚀 Stopping any existing containers...'
                sh 'docker-compose down --remove-orphans || true'

                echo '🚀 Starting all services with docker-compose...'
                sh 'docker-compose up -d --build'

                echo '🔍 Verifying containers are running...'
                sh 'docker ps'
            }
        }
    }

    // ── Post-Pipeline Notifications ──────────────────────────────────────────
    post {
        success {
            echo '''
            ╔════════════════════════════════════════╗
            ║  ✅  PIPELINE SUCCEEDED                ║
            ║  Frontend → http://localhost:3000      ║
            ║  Backend  → http://localhost:5000      ║
            ╚════════════════════════════════════════╝
            '''
        }
        failure {
            echo '❌ Pipeline FAILED. Check the logs above for details.'
        }
        always {
            echo '🧹 Pipeline finished. Check console output for results.'
        }
    }
}
