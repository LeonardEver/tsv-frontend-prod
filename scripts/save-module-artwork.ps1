param([Parameter(Mandatory=$true)][string]$ManifestPath)

$workspacePath = (Get-Location).Path
$destinationRoot = Join-Path $workspacePath 'src\assets\modules'
New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
Add-Type -AssemblyName System.Drawing
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderSettings = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderSettings.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]84)
$artworkEntries = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$savedCount = 0
foreach ($entry in $artworkEntries) {
  if ($entry.id -notmatch '^[A-Z]{3}-[a-z0-9-]+$') { throw "Invalid module ID: $($entry.id)" }
  $destinationPath = Join-Path $destinationRoot ($entry.id + '.jpg')
  if (Test-Path -LiteralPath $destinationPath) { continue }
  $sourceBitmap = [System.Drawing.Image]::FromFile($entry.path)
  $targetHeight = [int][Math]::Round(960 * $sourceBitmap.Height / $sourceBitmap.Width)
  $targetBitmap = New-Object System.Drawing.Bitmap(960, $targetHeight)
  $canvas = [System.Drawing.Graphics]::FromImage($targetBitmap)
  $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $canvas.DrawImage($sourceBitmap, 0, 0, 960, $targetHeight)
  $targetBitmap.Save($destinationPath, $jpegCodec, $encoderSettings)
  $canvas.Dispose()
  $targetBitmap.Dispose()
  $sourceBitmap.Dispose()
  $savedCount++
}
$encoderSettings.Dispose()
Write-Output "Saved $savedCount new module covers."
