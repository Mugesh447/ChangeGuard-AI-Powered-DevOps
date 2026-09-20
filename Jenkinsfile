pipeline{
  agent any 

  stages{
    stage('Checkout'){
      steps{
        checkout scm
      }
    }
    stage('Install Dependices'){
      stage{
        sh 'npm ci'
      }
    }
    stage('Test'){
      steps{
        sh 'npm test'
      }
    }
    stage('Lint'){
      steps{
        sh 'npm run typecheck'
      }
    }
    stage('Build Application'){
      steps{
        sh 'npm run typecheck'
      }
    }
    stage('Docker Compose Build'){
      steps{
        sh'docker compose up build'
      }
    }
    stage('Deploy'){
      steps{
        sh 'docker compose up -d'
      }
    }
    stage('Check Containers'){
      steps{
        sh 'docker compose ps'
      }
    }
  }
  post{
    sucess{
      echo 'Deployment Completed Sucessfully!'
    }
    failure{
      echo 'Pipeline Failed. Check the console output.'
    }
  }
}








    
