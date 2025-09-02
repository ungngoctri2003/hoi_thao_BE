# PowerShell script to start the development server with proper environment variables
$env:NODE_ENV = "development"
$env:PORT = "4000"

Write-Host "Starting Conference Management System Backend..." -ForegroundColor Green
Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor Yellow
Write-Host "PORT: $env:PORT" -ForegroundColor Yellow
Write-Host "CORS will allow all origins in development mode" -ForegroundColor Cyan

# Start the server
npm run dev
