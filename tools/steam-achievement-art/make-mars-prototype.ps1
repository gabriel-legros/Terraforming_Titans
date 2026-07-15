Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outputDir = Join-Path $repoRoot 'assets_in_progress\steam\achievements'
$sourceDir = Join-Path $outputDir 'sources'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $sourceDir | Out-Null

$sourceUrl = 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia00/pia00407/PIA00407.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1024&w=1024'
$sourcePath = Join-Path $sourceDir 'pia00407-mars-viking-global-color.jpg'

if (-not (Test-Path $sourcePath)) {
  Invoke-WebRequest -Uri $sourceUrl -OutFile $sourcePath
}

function New-Bitmap {
  param([int] $Width, [int] $Height)
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $bitmap.SetResolution(96, 96)
  return $bitmap
}

function New-LinearBrush {
  param(
    [System.Drawing.Rectangle] $Rect,
    [System.Drawing.Color] $Start,
    [System.Drawing.Color] $End,
    [float] $Angle
  )
  return New-Object System.Drawing.Drawing2D.LinearGradientBrush $Rect, $Start, $End, $Angle
}

function Add-ReusableBackground {
  param([System.Drawing.Graphics] $Graphics)

  $rect = New-Object System.Drawing.Rectangle 0, 0, 256, 256
  $backgroundBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(8, 10, 14))
  $Graphics.FillRectangle($backgroundBrush, $rect)
  $backgroundBrush.Dispose()

  $rng = New-Object System.Random 1337
  for ($i = 0; $i -lt 28; $i += 1) {
    $x = $rng.Next(8, 248)
    $y = $rng.Next(8, 248)
    $size = 1
    $alpha = $rng.Next(45, 115)
    $starBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, 220, 232, 240))
    $Graphics.FillEllipse($starBrush, $x, $y, $size, $size)
    $starBrush.Dispose()
  }
}

function Add-Frame {
  param([System.Drawing.Graphics] $Graphics)

  $outerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(205, 210, 222, 224)), 4.0
  $innerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(190, 80, 97, 110)), 2.0
  $Graphics.DrawRectangle($outerPen, 5, 5, 246, 246)
  $Graphics.DrawRectangle($innerPen, 11, 11, 234, 234)
  $outerPen.Dispose()
  $innerPen.Dispose()
}

function Add-Planet {
  param(
    [System.Drawing.Graphics] $Graphics,
    [System.Drawing.Bitmap] $Source,
    [bool] $Greyscale
  )

  $planetSize = 190
  $planetX = 33
  $planetY = 29
  $planetRect = New-Object System.Drawing.Rectangle $planetX, $planetY, $planetSize, $planetSize
  $srcRect = New-Object System.Drawing.Rectangle 0, 0, $Source.Width, $Source.Height

  $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(95, 0, 0, 0))
  $Graphics.FillEllipse($shadowBrush, $planetX + 8, $planetY + 12, $planetSize, $planetSize)
  $shadowBrush.Dispose()

  $oldClip = $Graphics.Clip
  $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clipPath.AddEllipse($planetRect)
  $Graphics.SetClip($clipPath)

  if ($Greyscale) {
    $matrix = New-Object System.Drawing.Imaging.ColorMatrix
    $matrix.Matrix00 = 0.30
    $matrix.Matrix01 = 0.30
    $matrix.Matrix02 = 0.30
    $matrix.Matrix10 = 0.59
    $matrix.Matrix11 = 0.59
    $matrix.Matrix12 = 0.59
    $matrix.Matrix20 = 0.11
    $matrix.Matrix21 = 0.11
    $matrix.Matrix22 = 0.11
    $matrix.Matrix33 = 1.0
    $matrix.Matrix44 = 1.0
    $attrs = New-Object System.Drawing.Imaging.ImageAttributes
    $attrs.SetColorMatrix($matrix)
    $Graphics.DrawImage($Source, $planetRect, 0, 0, $Source.Width, $Source.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
    $attrs.Dispose()
  } else {
    $Graphics.DrawImage($Source, $planetRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  }

  $shade = New-Object System.Drawing.Drawing2D.GraphicsPath
  $shade.AddEllipse($planetX - 16, $planetY - 10, $planetSize + 26, $planetSize + 26)
  $shadeBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $shade
  $shadeBrush.CenterPoint = New-Object System.Drawing.PointF ($planetX + 68), ($planetY + 56)
  $shadeBrush.CenterColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
  $shadeBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(125, 0, 0, 0))
  $Graphics.FillPath($shadeBrush, $shade)
  $shadeBrush.Dispose()
  $shade.Dispose()

  $Graphics.Clip = $oldClip
  $oldClip.Dispose()
  $clipPath.Dispose()

  $rimPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 236, 210, 170)), 3.0
  $Graphics.DrawEllipse($rimPen, $planetRect)
  $rimPen.Dispose()
}

function Save-Jpeg {
  param(
    [System.Drawing.Bitmap] $Bitmap,
    [string] $Path,
    [long] $Quality
  )

  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $parameters = New-Object System.Drawing.Imaging.EncoderParameters 1
  $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $Quality
  $Bitmap.Save($Path, $encoder, $parameters)
  $parameters.Dispose()
}

function New-AchievementImage {
  param(
    [System.Drawing.Bitmap] $Source,
    [string] $Path,
    [bool] $Greyscale
  )

  $bitmap = New-Bitmap 256 256
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  Add-ReusableBackground $graphics
  Add-Planet $graphics $Source $Greyscale
  Add-Frame $graphics
  $graphics.Dispose()
  Save-Jpeg $bitmap $Path 92
  $bitmap.Dispose()
}

function New-TemplateBackground {
  param([string] $Path)

  $bitmap = New-Bitmap 256 256
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  Add-ReusableBackground $graphics
  Add-Frame $graphics
  $graphics.Dispose()
  Save-Jpeg $bitmap $Path 92
  $bitmap.Dispose()
}

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
  New-TemplateBackground (Join-Path $outputDir 'achievement-template-background.jpg')
  New-AchievementImage $source (Join-Path $outputDir 'story-world-01-mars-colour.jpg') $false
  New-AchievementImage $source (Join-Path $outputDir 'story-world-01-mars-greyscale.jpg') $true
} finally {
  $source.Dispose()
}

Write-Host "Wrote Mars achievement prototype assets to $outputDir"
