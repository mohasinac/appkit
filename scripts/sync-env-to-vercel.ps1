param(
  [string]$EnvFile = ".env.local",
  [string]$Environment = "production",
  [switch]$Yes,
  [string]$ProjectDir
)

$ErrorActionPreference = "Stop"

# Force UTF-8 without BOM when piping strings to native commands (vercel CLI).
# PowerShell 5.1 default can be ASCII or UTF-8-with-BOM depending on the
# system profile, which causes Vercel to store a BOM prefix in every value.
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

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

if (-not $ProjectDir) {
  throw "Provide -ProjectDir pointing to the consumer app root (for example ../consumer-app)."
}

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
  # Strip surrounding quotes (single or double) and trim whitespace/CRLF so
  # the raw .env.local value (e.g. KEY="value") is stored without the quotes.
  $value = $parts[1].Trim().TrimEnd("`r", "`n")
  if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
    $value = $Matches[1]
  }

  if (-not $key) { return }

  Write-Host "Updating $key"

  # Delegate to vercel-env-set.mjs which uses child_process.spawnSync with
  # input as a raw Buffer — the only method that avoids BOM injection on Windows.
  # Both PowerShell pipe and .NET Process.StandardInput cause Node to read
  # stdin with a BOM prefix on Windows; a Node-to-Node Buffer pipe does not.
  $vercelJs  = (Get-Command vercel -ErrorAction Stop).Source `
    -replace '\\vercel\.ps1$', '\node_modules\vercel\dist\vc.js'
  $helperJs  = Join-Path $PSScriptRoot "vercel-env-set.mjs"
  $forceFlag = if ($Yes) { "--force" } else { "" }

  & node $helperJs $vercelJs $key $Environment $value $projectPath $forceFlag | Out-Null
}

Write-Host "Done."
