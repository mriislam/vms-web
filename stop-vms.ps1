# ================================================================
#  VMS - Stop Backend + Frontend
#  Usage: powershell -ExecutionPolicy Bypass -File stop-vms.ps1
# ================================================================

Write-Host ""
Write-Host "  Stopping VMS services..." -ForegroundColor Yellow

Stop-Process -Name java -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] Backend stopped" -ForegroundColor Green

$pids5173 = netstat -ano 2>$null | Select-String ":5173 " |
    ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
foreach ($p in $pids5173) {
    if ($p -match '^\d+$') { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue }
}
Write-Host "  [OK] Frontend stopped" -ForegroundColor Green
Write-Host ""
Write-Host "  All VMS services stopped." -ForegroundColor Cyan
Write-Host ""
