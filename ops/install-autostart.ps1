# Makes this PC the dashboard's server: when Windows boots — before anyone signs in — the
# «HRM ARGOS dashboard» task starts ops/supervisor.mjs (next start on :3010, LAN) and keeps it
# running. S4U («run whether the user is logged on or not», no stored password) as SSVPortal does:
# there is no Postgres here, so the admin-token trap of the Nomenklatura task does not apply.
#
#   powershell -ExecutionPolicy Bypass -File ops\install-autostart.ps1          -- register + start
#   powershell -ExecutionPolicy Bypass -File ops\install-autostart.ps1 -Remove  -- unregister
#
# The task does not build. After a code change: npm run build; npm run server:restart.

param([switch]$Remove)

$ErrorActionPreference = 'Stop'
$name = 'HRM ARGOS dashboard'
$proj = Split-Path -Parent $PSScriptRoot

if ($Remove) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "[avtostart] '$name' o'chirildi"
  } else { Write-Host "[avtostart] '$name' topilmadi" }
  exit 0
}

foreach ($f in @('.next\BUILD_ID', 'ops\server.env')) {
  if (-not (Test-Path (Join-Path $proj $f))) { throw "$f yo'q - avval npm run build va ops\server.env" }
}

$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute "$env:WINDIR\System32\conhost.exe" `
  -Argument "--headless `"$node`" ops\supervisor.mjs" -WorkingDirectory $proj
$boot = New-ScheduledTaskTrigger -AtStartup
$boot.Delay = 'PT30S'   # let the network come up first
$logon = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"   # a fallback; ignored while running
$trigger = @($boot, $logon)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal `
  -Settings $settings -Description 'HRM ARGOS dashboard: next start :3010 (LAN), ops\supervisor.mjs' `
  -Force | Out-Null
Start-ScheduledTask -TaskName $name
Write-Host "[avtostart] '$name' yozildi va ishga tushirildi" -ForegroundColor Green
