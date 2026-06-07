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
pnpm --filter @workshop/web dev
