# PostgreSQL Connection Checker Script

Write-Host "=== PostgreSQL Connection Checker ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL port is listening
Write-Host "Checking if PostgreSQL is running on port 5432..." -ForegroundColor Yellow
$portCheck = netstat -an | Select-String "5432" | Select-String "LISTENING"

if ($portCheck) {
    Write-Host "PostgreSQL appears to be running on port 5432" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL is NOT running on port 5432" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start PostgreSQL:" -ForegroundColor Yellow
    Write-Host "1. Open Services - Press Win+R, type services.msc" -ForegroundColor White
    Write-Host "2. Find postgresql service" -ForegroundColor White
    Write-Host "3. Right-click and Start" -ForegroundColor White
    Write-Host ""
    Write-Host "OR use Docker:" -ForegroundColor Yellow
    Write-Host "docker run --name postgres-ideaspace -e POSTGRES_PASSWORD=password -e POSTGRES_DB=idea_platform -p 5432:5432 -d postgres" -ForegroundColor White
}

Write-Host ""
Write-Host "Checking PostgreSQL service..." -ForegroundColor Yellow
$services = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue

if ($services) {
    Write-Host "Found PostgreSQL services:" -ForegroundColor Green
    foreach ($service in $services) {
        if ($service.Status -eq "Running") {
            Write-Host "  $($service.DisplayName): Running" -ForegroundColor Green
        } else {
            Write-Host "  $($service.DisplayName): Stopped" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No PostgreSQL service found" -ForegroundColor Red
    Write-Host ""
    Write-Host "PostgreSQL may not be installed. Download from:" -ForegroundColor Yellow
    Write-Host "https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Checking psql command..." -ForegroundColor Yellow
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "psql found at: $($psqlPath.Source)" -ForegroundColor Green
} else {
    Write-Host "psql command not found in PATH" -ForegroundColor Red
    Write-Host "PostgreSQL may not be installed or not in PATH" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Environment Variables Check ===" -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host ".env file exists" -ForegroundColor Green
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^DB_" }
    if ($envContent) {
        Write-Host "Database variables found:" -ForegroundColor Green
        foreach ($line in $envContent) {
            if ($line -match "PASSWORD") {
                Write-Host "  DB_PASSWORD: ***hidden***" -ForegroundColor Gray
            } else {
                Write-Host "  $line" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "No DB_* variables found in .env" -ForegroundColor Red
    }
} else {
    Write-Host ".env file NOT found" -ForegroundColor Red
    Write-Host "Create .env file with database credentials" -ForegroundColor Yellow
}

Write-Host ""
