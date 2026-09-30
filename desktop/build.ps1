$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location (Join-Path $root 'frontend')
try { npm ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }; npm run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' } } finally { Pop-Location }
Push-Location (Join-Path $root 'backend')
try {
  & ./.venv/Scripts/python.exe -m pip install -r requirements-desktop.txt
  if ($LASTEXITCODE -ne 0) { throw 'Build dependencies failed' }
  & ./.venv/Scripts/python.exe -m PyInstaller --noconfirm --clean --onedir --name training-server --distpath ../build/backend --workpath ../build/pyinstaller --specpath ../build --collect-all uvicorn --collect-all argon2 --exclude-module pytest --exclude-module httpx desktop_server.py
  if ($LASTEXITCODE -ne 0) { throw 'Backend freeze failed' }
} finally { Pop-Location }
Push-Location $PSScriptRoot
try {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'Desktop dependencies failed' }
  node node_modules/electron/install.js
  if ($LASTEXITCODE -ne 0) { throw 'Electron runtime download failed' }
  npm run dist
  if ($LASTEXITCODE -ne 0) { throw 'Installer build failed' }
} finally { Pop-Location }
