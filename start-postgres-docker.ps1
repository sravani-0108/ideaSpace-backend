# Start PostgreSQL using Docker

Write-Host "Starting PostgreSQL with Docker..." -ForegroundColor Cyan

# Check if Docker is running
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running or not installed!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if container already exists
$containerExists = docker ps -a --filter "name=postgres-ideaspace" --format "{{.Names}}"

if ($containerExists -eq "postgres-ideaspace") {
    Write-Host "Container exists. Starting it..." -ForegroundColor Yellow
    docker start postgres-ideaspace
} else {
    Write-Host "Creating new PostgreSQL container..." -ForegroundColor Yellow
    docker run --name postgres-ideaspace `
        -e POSTGRES_PASSWORD=password `
        -e POSTGRES_DB=idea_platform `
        -p 5432:5432 `
        -d postgres
}

Write-Host ""
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$containerStatus = docker ps --filter "name=postgres-ideaspace" --format "{{.Status}}"
if ($containerStatus) {
    Write-Host "PostgreSQL container is running!" -ForegroundColor Green
    Write-Host "Status: $containerStatus" -ForegroundColor Green
    Write-Host ""
    Write-Host "Connection details:" -ForegroundColor Cyan
    Write-Host "  Host: localhost" -ForegroundColor White
    Write-Host "  Port: 5432" -ForegroundColor White
    Write-Host "  Database: idea_platform" -ForegroundColor White
    Write-Host "  Username: postgres" -ForegroundColor White
    Write-Host "  Password: password" -ForegroundColor White
    Write-Host ""
    Write-Host "Your .env file should have:" -ForegroundColor Yellow
    Write-Host "  DB_PASSWORD=password" -ForegroundColor White
} else {
    Write-Host "Failed to start PostgreSQL container" -ForegroundColor Red
    Write-Host "Check Docker logs: docker logs postgres-ideaspace" -ForegroundColor Yellow
}

