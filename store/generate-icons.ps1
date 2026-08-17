$projectRoot = Split-Path -Parent $PSScriptRoot
$iconDirectory = Join-Path $projectRoot 'extension\\icons'

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null

foreach ($size in 16, 32, 48, 128) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(24, 61, 52))
  $inset = [Math]::Max(1, [int]($size * 0.11))
  $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(201, 232, 95))
  $graphics.FillRectangle($accent, $inset, $inset, $size - ($inset * 2), $size - ($inset * 2))
  $fontSize = [Math]::Max(6, [int]($size * 0.31))
  $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $foreground = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 61, 52))
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString('JW', $font, $foreground, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $format)
  $bitmap.Save((Join-Path $iconDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $format.Dispose()
  $foreground.Dispose()
  $font.Dispose()
  $accent.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
