$ErrorActionPreference = "Stop"

Write-Host "1. Verificando servicios..." -ForegroundColor Cyan
docker compose ps

Write-Host "`n2. Salud de Catalog API..." -ForegroundColor Cyan
Invoke-RestMethod http://localhost:8080/api/catalog/health | Format-List

Write-Host "`n3. Salud de Interactions API..." -ForegroundColor Cyan
Invoke-RestMethod http://localhost:8080/api/interactions/health | Format-List

Write-Host "`n4. Consultando videojuegos..." -ForegroundColor Cyan
$games = Invoke-RestMethod http://localhost:8080/api/catalog/games
Write-Host "Videojuegos encontrados: $($games.total)" -ForegroundColor Green

Write-Host "`n5. Consultando estadísticas temporales..." -ForegroundColor Cyan
Invoke-RestMethod http://localhost:8080/api/interactions/stats | Format-List

Write-Host "`n6. Verificando aislamiento de puertos..." -ForegroundColor Cyan
foreach ($port in 5432, 6379, 5000, 5001) {
    $result = Test-NetConnection localhost -Port $port -WarningAction SilentlyContinue
    Write-Host "Puerto $port publicado: $($result.TcpTestSucceeded)"
}

Write-Host "`nPruebas básicas finalizadas." -ForegroundColor Green
