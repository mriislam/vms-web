# ================================================================
#  VMS - Start Backend + Frontend
#  Usage: powershell -ExecutionPolicy Bypass -File start-vms.ps1
# ================================================================

$LOG_DIR   = "D:\VMS\logs"
$BACK_LOG  = "$LOG_DIR\backend.log"
$FRONT_LOG = "$LOG_DIR\frontend.log"

function Ok  { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Fail { param($m) Write-Host "  [!!] $m" -ForegroundColor Red }
function Dot { param($m) Write-Host "  ... $m" -ForegroundColor DarkGray }

Clear-Host
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Blue
Write-Host "     VMS Fleet Manager  -  Startup Script  " -ForegroundColor Blue
Write-Host "  ==========================================" -ForegroundColor Blue
Write-Host ""

# 1. Ensure log directory exists
New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null

# 2. Kill existing processes
Write-Host "  Stopping any existing instances..." -ForegroundColor Cyan
Stop-Process -Name java -Force -ErrorAction SilentlyContinue
$pids5173 = netstat -ano 2>$null | Select-String ":5173 " |
    ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
foreach ($p in $pids5173) {
    if ($p -match '^\d+$') { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1
Ok "Previous instances cleared"

# 3. Start Backend (batch file handles its own log redirect)
Write-Host "  Starting Backend  (https://localhost:8443)..." -ForegroundColor Cyan
Set-Content -Path $BACK_LOG -Value "" -Encoding UTF8

Start-Process -FilePath "D:\VMS\run-backend.bat" -WindowStyle Hidden

$timeout = 180; $elapsed = 0; $backOk = $false
while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 3; $elapsed += 3
    $raw = Get-Content $BACK_LOG -Raw -ErrorAction SilentlyContinue
    if ($raw -match "Started VmsApplication")           { $backOk = $true; break }
    if ($raw -match "BUILD FAILURE|APPLICATION FAILED") { break }
    Dot "Backend warming up... ($elapsed s)"
}

if ($backOk) {
    Ok "Backend running  ->  https://localhost:8443"
} else {
    Fail "Backend failed to start. Last 10 lines of log:"
    Get-Content $BACK_LOG -Tail 10 -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    exit 1
}

# 4. Start Frontend (batch file handles its own log redirect)
Write-Host "  Starting Frontend (http://localhost:5173)..." -ForegroundColor Cyan
Set-Content -Path $FRONT_LOG -Value "" -Encoding UTF8

Start-Process -FilePath "D:\VMS\run-frontend.bat" -WindowStyle Hidden

$timeout = 30; $elapsed = 0; $frontOk = $false
while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 2; $elapsed += 2
    $raw = Get-Content $FRONT_LOG -Raw -ErrorAction SilentlyContinue
    if ($raw -match "localhost") { $frontOk = $true; break }
    Dot "Frontend warming up... ($elapsed s)"
}

if ($frontOk) {
    Ok "Frontend running ->  http://localhost:5173"
} else {
    Fail "Frontend failed to start. Check: $FRONT_LOG"
    exit 1
}

# 5. Summary
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host "   VMS IS RUNNING" -ForegroundColor Green
Write-Host "   Backend   ->  https://localhost:8443" -ForegroundColor Green
Write-Host "   Frontend  ->  http://localhost:5173" -ForegroundColor Green
Write-Host "   Logs      ->  D:\VMS\logs\" -ForegroundColor Green
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To stop: powershell -ExecutionPolicy Bypass -File D:\VMS\stop-vms.ps1" -ForegroundColor Yellow
Write-Host ""
