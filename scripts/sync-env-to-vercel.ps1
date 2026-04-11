param(
  [string]$EnvFile = ".env.local",
  [string]$Environment = "production",
  [switch]$Yes,
  [string]$ProjectDir = "../letitrip.in"
)

$ErrorActionPreference = "Stop"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command '$name' was not found in PATH."
  }
}

function Resolve-ProjectPath([string]$path) {
  $base = Split-Path -Parent $PSScriptRoot
  return [System.IO.Path]::GetFullPath((Join-Path $base $path))
}

Assert-Command "vercel"

$projectPath = Resolve-ProjectPath $ProjectDir
$envPath = Join-Path $projectPath $EnvFile

if (-not (Test-Path $projectPath)) {
  throw "Project directory not found: $projectPath"
}

if (-not (Test-Path $envPath)) {
  throw "Env file not found: $envPath"
}

Write-Host "Syncing env vars from '$envPath' to Vercel environment '$Environment'..."

Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }

  $parts = $line -split "=", 2
  if ($parts.Count -ne 2) { return }

  $key = $parts[0].Trim()
  $value = $parts[1]

  if (-not $key) { return }

  Write-Host "Updating $key"
  if ($Yes) {
    $value | vercel env add $key $Environment --yes --cwd $projectPath | Out-Null
  } else {
    $value | vercel env add $key $Environment --cwd $projectPath | Out-Null
  }
}

Write-Host "Done."
