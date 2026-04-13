param(
  [string]$ProjectDir,
  [switch]$Yes
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

Assert-Command "firebase"

if (-not $ProjectDir) {
  throw "Provide -ProjectDir pointing to the consumer app root (for example ../consumer-app)."
}

$projectPath = Resolve-ProjectPath $ProjectDir
$functionsDir = Join-Path $projectPath "functions"

if (-not (Test-Path $projectPath)) {
  throw "Project directory not found: $projectPath"
}

if (-not (Test-Path $functionsDir)) {
  throw "Functions directory not found: $functionsDir"
}

Write-Host "Deploying Firebase Functions from '$projectPath'..."
if ($Yes) {
  firebase deploy --only functions --cwd "$projectPath" --non-interactive
} else {
  firebase deploy --only functions --cwd "$projectPath"
}

Write-Host "Done."
