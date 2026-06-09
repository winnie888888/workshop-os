# Zazene WEB na portu 3000 v REALNEM nacinu (pravi backend na :3001).

# --- Self-healing: sprosti port 3000, ce ga drzi star proces ---
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
Stop-Port 3000

$env:PORT = "3000"
$env:NEXT_PUBLIC_DEMO = "0"
# Pravi backend tece na :3001 (glej dev-api.ps1), in vklopi lokalni dev-login
# gumb na vstopni strani (brez pravega OIDC, ki ga lokalno ni).
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:3001"
$env:NEXT_PUBLIC_DEV_AUTH = "1"
pnpm --filter @workshop/web dev
