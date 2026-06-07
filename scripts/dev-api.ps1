# Zazene API lokalno z dev-loginom (brez pravega OIDC). SAMO za razvoj.
# Uporaba:  ./scripts/dev-api.ps1   (iz korena repozitorija)

# --- Self-healing: sprosti port 3001, ce ga drzi star proces ---
function Stop-Port($port) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
      try { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } catch {}
    }
    Write-Host "Sprostil port $port (star proces ustavljen)." -ForegroundColor Yellow
    Start-Sleep -Milliseconds 500
  }
}
Stop-Port 3001

$env:DATABASE_URL    = "postgres://workshop:workshop@localhost:5432/workshop"
$env:DEV_AUTH        = "1"
$env:NODE_ENV        = "development"
$env:PORT            = "3001"
$env:STORAGE_DRIVER  = "local"
$env:WEB_APP_BASE_URL = "http://localhost:3000"
# Zgradi skupni paket (@workshop/shared -> dist), da ga api in web bereta od tam.
pnpm --filter @workshop/shared build
pnpm --filter @workshop/api start:dev
