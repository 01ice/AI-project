<#
.SYNOPSIS
  把项目打包并上传到腾讯云服务器（排除依赖、本地上传文件与 .env）。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/package-for-server.ps1 -ServerHost 1.2.3.4 -User ubuntu -KeyPath C:\Users\me\.ssh\cyy.pem
#>
param(
  [Parameter(Mandatory = $true)][string]$ServerHost,
  [string]$User = 'ubuntu',
  [int]$Port = 22,
  [string]$RemoteDir = '/opt/zhanqiao',
  [string]$KeyPath = ''
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$archive = Join-Path $env:TEMP "zhanqiao-$stamp.tar.gz"

$sshArgs = @()
if ($KeyPath) {
  $sshArgs += @('-i', $KeyPath, '-o', 'IdentitiesOnly=yes')
}

$tarArgs = @(
  '-czf', $archive,
  '--exclude=node_modules',
  '--exclude=.nuxt',
  '--exclude=.output',
  '--exclude=.data',
  '--exclude=.git',
  '--exclude=.env',
  '--exclude=public/uploads',
  '-C', $projectRoot, '.'
)

Write-Host "打包项目：$projectRoot" -ForegroundColor Cyan
tar @tarArgs
if ($LASTEXITCODE -ne 0) { throw 'tar 打包失败' }

$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 2)
Write-Host "已生成 $archive（$sizeMb MB）" -ForegroundColor Cyan

Write-Host '确保远端目录存在…' -ForegroundColor Cyan
ssh @sshArgs -p $Port "$User@$ServerHost" "mkdir -p $RemoteDir"

Write-Host '上传…' -ForegroundColor Cyan
scp @sshArgs -P $Port $archive "$User@$ServerHost`:$RemoteDir/"
if ($LASTEXITCODE -ne 0) { throw 'scp 上传失败' }

$remoteArchive = "$RemoteDir/zhanqiao-$stamp.tar.gz"

# 解压前先删掉由仓库管理的目录：tar 只会覆盖，不会删除本地已删掉的文件
$managedDirs = 'app server shared content public drizzle deploy scripts'
$pruneCmd = ($managedDirs.Split(' ') | ForEach-Object { "rm -rf '$RemoteDir/$_'" }) -join '; '

Write-Host '清理旧文件并解压…' -ForegroundColor Cyan
ssh @sshArgs -p $Port "$User@$ServerHost" "$pruneCmd; cd $RemoteDir && tar -xzf '$remoteArchive' && rm -f '$remoteArchive' && ls -1"

Remove-Item $archive -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '上传完成。接下来在服务器上：' -ForegroundColor Green
Write-Host "  cd $RemoteDir"
Write-Host '  cp .env.production.example .env && vi .env'
Write-Host '  sudo docker compose up -d --build'
