param(
  [string]$ProjectDir = "../letitrip.in",
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

$projectPath = Resolve-ProjectPath $ProjectDir
$indexFile = Join-Path $projectPath "firestore.indexes.json"

if (-not (Test-Path $projectPath)) {
  throw "Project directory not found: $projectPath"
}

if (-not (Test-Path $indexFile)) {
  throw "File not found: $indexFile"
}

Write-Host "Deploying Firestore indexes from '$projectPath'..."
if ($Yes) {
  firebase deploy --only firestore:indexes --cwd "$projectPath" --non-interactive
} else {
  firebase deploy --only firestore:indexes --cwd "$projectPath"
}

Write-Host "Done."
