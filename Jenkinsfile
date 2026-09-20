pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Lint') {
            steps {
                bat 'npm run lint'
            }
        }

        stage('Type Check') {
            steps {
                bat 'npm run typecheck'
            }
        }

        stage('Build Application') {
            steps {
                bat 'npm run build'
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                bat 'docker compose up -d'
            }
        }

        stage('Check Containers') {
            steps {
                bat 'docker compose ps'
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed. Check the stages above.'
        }
    }
}
