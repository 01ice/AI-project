<#
.SYNOPSIS
  把项目打包并上传到腾讯云服务器（排除依赖、本地上传文件与 .env）。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/package-for-server.ps1 -ServerHost 1.2.3.4

.EXAMPLE
  # 指定用户、端口与远端目录
  powershell -ExecutionPolicy Bypass -File scripts/package-for-server.ps1 -ServerHost 1.2.3.4 -User ubuntu -Port 22 -RemoteDir /opt/zhanqiao
#>
param(
  [Parameter(Mandatory = $true)][string]$ServerHost,
  [string]$User = 'root',
  [int]$Port = 22,
  [string]$RemoteDir = '/opt/zhanqiao'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$archive = Join-Path $env:TEMP "zhanqiao-$stamp.tar.gz"

Write-Host "打包项目：$projectRoot" -ForegroundColor Cyan

# 用 Windows 自带的 bsdtar；--exclude 必须在 -C 之前对路径生效
tar -czf $archive `
  --exclude=node_modules `
  --exclude=.nuxt `
  --exclude=.output `
  --exclude=.data `
  --exclude=.git `
  --exclude=.env `
  --exclude=public/uploads `
  --exclude='*.log' `
  -C $projectRoot .

$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 2)
Write-Host "已生成 $archive（$sizeMb MB）" -ForegroundColor Cyan

Write-Host "在服务器上创建目录…" -ForegroundColor Cyan
ssh -p $Port "$User@$ServerHost" "mkdir -p $RemoteDir"

Write-Host "上传…" -ForegroundColor Cyan
scp -P $Port $archive "$User@$ServerHost`:$RemoteDir/"

$remoteArchive = "$RemoteDir/zhanqiao-$stamp.tar.gz"
Write-Host "解压…" -ForegroundColor Cyan
ssh -p $Port "$User@$ServerHost" "cd $RemoteDir && tar -xzf $remoteArchive && rm -f $remoteArchive && ls -1 | head -20"

Write-Host ""
Write-Host "上传完成。接下来在服务器上：" -ForegroundColor Green
Write-Host "  cd $RemoteDir"
Write-Host "  cp .env.production.example .env && vi .env   # 填数据库密码、站点地址、SMTP 授权码"
Write-Host "  docker compose up -d --build"
Remove-Item $archive -ErrorAction SilentlyContinue
