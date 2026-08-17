param(
  [string]$OutputDirectory = "$PSScriptRoot\dist"
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'extension'
$stageDirectory = Join-Path $OutputDirectory 'job-workbench-autofill'
$zipPath = Join-Path $OutputDirectory 'job-workbench-autofill.zip'

if (Test-Path -LiteralPath $stageDirectory) { Remove-Item -LiteralPath $stageDirectory -Recurse -Force }
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
New-Item -ItemType Directory -Force -Path $stageDirectory | Out-Null

$files = Get-ChildItem -LiteralPath $extensionRoot -File -Recurse | Where-Object {
  $_.Name -notmatch '\.test\.js$' -and $_.Extension -notin @('.map')
}

foreach ($file in $files) {
  $relativePath = $file.FullName.Substring($extensionRoot.Length).TrimStart('\\')
  $destination = Join-Path $stageDirectory $relativePath
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $destination
}

Compress-Archive -Path (Join-Path $stageDirectory '*') -DestinationPath $zipPath
Write-Output "Created $zipPath"
