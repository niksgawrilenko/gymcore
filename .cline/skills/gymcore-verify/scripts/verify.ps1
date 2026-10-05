# verify.ps1 - compact verification report for GymCore
# Usage: npm run verify [-- -SkipLint|-SkipBuild|-Full]
#        powershell -NoProfile -ExecutionPolicy Bypass -File .cline/skills/gymcore-verify/scripts/verify.ps1 [-SkipLint] [-SkipBuild] [-Full]
# Read-only for sources. Prints a short report so huge build output stays out of the context window.

param(
  [switch]$SkipLint,
  [switch]$SkipBuild,
  [switch]$Full
)

$ErrorActionPreference = 'Continue'
$env:FORCE_COLOR = '0'
$env:NO_COLOR = '1'

# scripts/ -> gymcore-verify/ -> skills/ -> .cline/ -> repo root
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
Set-Location $root

function Invoke-Step {
  param([string]$Name, [string]$Exe, [string[]]$ArgList)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $out = & $Exe @ArgList 2>&1 | Out-String
  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
  $sw.Stop()
  [pscustomobject]@{
    Name = $Name
    Code = $code
    Out  = $out
    Secs = [math]::Round($sw.Elapsed.TotalSeconds, 1)
  }
}

$steps = @()

# Prefer local binaries via node: no npm.cmd wrapper, cleaner output, no network
$tsc    = Join-Path $root 'node_modules\typescript\bin\tsc'
$eslint = Join-Path $root 'node_modules\eslint\bin\eslint.js'
$next   = Join-Path $root 'node_modules\next\dist\bin\next'

if (Test-Path $tsc) {
  $steps += Invoke-Step -Name 'tsc' -Exe 'node' -ArgList @($tsc, '--noEmit')
} else {
  $steps += Invoke-Step -Name 'tsc' -Exe 'npx' -ArgList @('--no-install', 'tsc', '--noEmit')
}

if (-not $SkipLint) {
  if (Test-Path $eslint) {
    $steps += Invoke-Step -Name 'eslint' -Exe 'node' -ArgList @($eslint, '.')
  } else {
    $steps += Invoke-Step -Name 'eslint' -Exe 'npm' -ArgList @('run', 'lint')
  }
}

if (-not $SkipBuild) {
  if (Test-Path $next) {
    $steps += Invoke-Step -Name 'build' -Exe 'node' -ArgList @($next, 'build')
  } else {
    $steps += Invoke-Step -Name 'build' -Exe 'npm' -ArgList @('run', 'build')
  }
}

Write-Output ''
Write-Output '=== GymCore verify ==='
foreach ($s in $steps) {
  $tag = 'PASS'
  if ($s.Code -ne 0) { $tag = 'FAIL' }
  Write-Output ('[{0}] {1} ({2}s)' -f $tag, $s.Name, $s.Secs)
}

$failed = @($steps | Where-Object { $_.Code -ne 0 })

if ($failed.Count -eq 0) {
  Write-Output 'RESULT: ALL PASS'
  exit 0
}

foreach ($s in $failed) {
  Write-Output ''
  Write-Output ('--- {0} (exit {1}) ---' -f $s.Name, $s.Code)
  if ($Full) {
    Write-Output $s.Out
    continue
  }
  $lines = @($s.Out -split "`r?`n")
  $interesting = @($lines | Where-Object { $_ -match 'error|Error|failed|Failed|Cannot find|not assignable|Type .* is not|Warning' } | Select-Object -First 40)
  if ($interesting.Count -eq 0) {
    $interesting = @($lines | Where-Object { $_.Trim() -ne '' } | Select-Object -Last 40)
  }
  Write-Output ($interesting -join "`n")
}

Write-Output ''
Write-Output 'RESULT: FAIL'
exit 1
