# check-setup.ps1 - Verifica ambiente de desenvolvimento GestorAdv
# Uso:
#   powershell -ExecutionPolicy Bypass -File D:\sistemas\GestorAdv\check-setup.ps1
#   powershell -ExecutionPolicy Bypass -File check-setup.ps1 -TestApi -JwtToken "eyJ..."

param(
    [string]$ProjectRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
    [string]$ApiUrl = "http://localhost:3001/api",
    [string]$JwtToken = "",
    [switch]$TestApi,
    [switch]$TestWhatsapp,
    [switch]$FixPgVector
)

$ErrorActionPreference = "Continue"

function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[AVISO] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "[FALHA] $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }

$results = @{
    passed = 0
    warned = 0
    failed = 0
}

function Add-Result($status) {
    switch ($status) {
        "ok"     { $script:results.passed++ }
        "warn"   { $script:results.warned++ }
        "fail"   { $script:results.failed++ }
    }
}

function Test-CommandExists($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Read-EnvFile($path) {
    $vars = @{}
    if (-not (Test-Path $path)) { return $vars }
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line -match '^\s*#' -or $line -eq "") { return }
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            $vars[$key] = $val
        }
    }
    return $vars
}

function Mask-Secret($value) {
    if (-not $value -or $value -match '^\.\.\.$|^sk-\.\.\.$') { return "(nao definido)" }
    if ($value.Length -le 8) { return "****" }
    return ($value.Substring(0, 4) + "..." + $value.Substring($value.Length - 4))
}

Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host " GestorAdv - Verificacao de Ambiente" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host "Projeto: $ProjectRoot"
Write-Host ""

# --- 1. Ferramentas base ---
Write-Info "1/9 Ferramentas base"

foreach ($tool in @("node", "pnpm", "docker", "git")) {
    if (Test-CommandExists $tool) {
        $ver = & $tool --version 2>$null | Select-Object -First 1
        Write-Ok "$tool : $ver"
        Add-Result "ok"
    } else {
        Write-Fail "$tool nao encontrado no PATH"
        Add-Result "fail"
    }
}

# --- 2. Docker daemon ---
Write-Info "2/9 Docker"

try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Docker daemon ativo"
        Add-Result "ok"
    } else {
        throw "daemon indisponivel"
    }
} catch {
    Write-Fail "Docker nao esta rodando. Abra o Docker Desktop."
    Add-Result "fail"
}

$expectedContainers = @(
    @{ Name = "gestoradv-postgres"; Port = 5432; Label = "PostgreSQL" },
    @{ Name = "gestoradv-redis";    Port = 6379; Label = "Redis" },
    @{ Name = "gestoradv-mongo";    Port = 27017; Label = "MongoDB" }
)

foreach ($c in $expectedContainers) {
    $running = docker ps --filter "name=$($c.Name)" --filter "status=running" -q 2>$null
    if ($running) {
        Write-Ok "Container $($c.Label) ($($c.Name)) rodando - porta $($c.Port)"
        Add-Result "ok"
    } else {
        $exists = docker ps -a --filter "name=$($c.Name)" -q 2>$null
        if ($exists) {
            Write-Warn "Container $($c.Name) existe mas esta parado. Rode: pnpm docker:up"
            Add-Result "warn"
        } else {
            Write-Warn "Container $($c.Name) nao encontrado. Rode: pnpm docker:up"
            Add-Result "warn"
        }
    }
}

# --- 3. Arquivo .env ---
Write-Info "3/9 Variaveis de ambiente"

$envPath = Join-Path $ProjectRoot ".env"
$envExample = Join-Path $ProjectRoot ".env.example"

if (-not (Test-Path $envPath)) {
    Write-Fail ".env nao encontrado. Copie: cp .env.example .env"
    Add-Result "fail"
    $envVars = @{}
} else {
    Write-Ok ".env encontrado"
    Add-Result "ok"
    $envVars = Read-EnvFile $envPath
}

if (-not (Test-Path $envExample)) {
    Write-Warn ".env.example nao encontrado"
    Add-Result "warn"
}

$requiredEnv = @("DATABASE_URL", "REDIS_URL", "JWT_SECRET", "NEXTAUTH_URL")
foreach ($key in $requiredEnv) {
    if ($envVars[$key] -and $envVars[$key] -notmatch '^\s*$|gere-com-openssl') {
        Write-Ok "$key configurado"
        Add-Result "ok"
    } else {
        Write-Warn "$key ausente ou placeholder - ajuste no .env"
        Add-Result "warn"
    }
}

# IA keys
$hasAnthropic = [bool]($envVars["ANTHROPIC_API_KEY"] -and $envVars["ANTHROPIC_API_KEY"] -notmatch '^\s*$|sk-ant-\.\.\.')
$hasOpenAi    = [bool]($envVars["OPENAI_API_KEY"] -and $envVars["OPENAI_API_KEY"] -notmatch '^\s*$|sk-\.\.\.')

if ($hasAnthropic) {
    Write-Ok "ANTHROPIC_API_KEY : $(Mask-Secret $envVars['ANTHROPIC_API_KEY'])"
    Add-Result "ok"
} else {
    Write-Warn "ANTHROPIC_API_KEY nao configurada - triagem, pecas e agent desabilitados"
    Add-Result "warn"
}

if ($hasOpenAi) {
    Write-Ok "OPENAI_API_KEY : $(Mask-Secret $envVars['OPENAI_API_KEY']) (embeddings/RAG/fallback)"
    Add-Result "ok"
} else {
    Write-Warn "OPENAI_API_KEY nao configurada - RAG/embeddings nao funcionarao"
    Add-Result "warn"
}

if (-not $hasAnthropic -and -not $hasOpenAi) {
    Write-Fail "Nenhuma chave de IA (Anthropic ou OpenAI). Configure pelo menos uma."
    Add-Result "fail"
}

if ($envVars["DATAJUD_API_KEY"] -and $envVars["DATAJUD_API_KEY"] -notmatch '^\s*$') {
    Write-Ok "DATAJUD_API_KEY configurada - sync tribunais habilitado"
    Add-Result "ok"
} else {
    Write-Warn "DATAJUD_API_KEY ausente - sync tribunais usara apenas Playwright (se disponivel)"
    Add-Result "warn"
}

# --- 4. PostgreSQL + pgvector ---
Write-Info "4/9 PostgreSQL e pgvector"

$pgRunning = docker ps --filter "name=gestoradv-postgres" --filter "status=running" -q 2>$null
if ($pgRunning) {
    try {
        $pgPing = docker exec gestoradv-postgres pg_isready -U gestoradv -d gestoradv 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "PostgreSQL respondendo (gestoradv)"
            Add-Result "ok"
        } else {
            Write-Fail "PostgreSQL nao responde: $pgPing"
            Add-Result "fail"
        }

        $extVector = docker exec gestoradv-postgres psql -U gestoradv -d gestoradv -tAc 'SELECT 1 FROM pg_extension WHERE extname=''vector'';' 2>$null
        $extVector = ($extVector -join "").Trim()

        if ($extVector -eq "1") {
            Write-Ok "Extensao pgvector instalada"
            Add-Result "ok"
        } else {
            Write-Warn "pgvector NAO instalado - RAG vetorial desabilitado (busca ILIKE ainda funciona)"
            Add-Result "warn"

            if ($FixPgVector) {
                Write-Info "Tentando instalar pgvector..."
                $sqlFile = Join-Path $ProjectRoot "docker\init\02-pgvector.sql"
                if (Test-Path $sqlFile) {
                    Get-Content $sqlFile -Raw | docker exec -i gestoradv-postgres psql -U gestoradv -d gestoradv 2>&1
                    $extAfter = docker exec gestoradv-postgres psql -U gestoradv -d gestoradv -tAc 'SELECT 1 FROM pg_extension WHERE extname=''vector'';' 2>$null
                    if (($extAfter -join "").Trim() -eq "1") {
                        Write-Ok "pgvector instalado com sucesso"
                    } else {
                        Write-Fail "Falha ao instalar pgvector. Troque imagem Docker para pgvector/pgvector:pg16"
                    }
                } else {
                    Write-Fail "Arquivo docker\init\02-pgvector.sql nao encontrado"
                }
            } else {
                Write-Info "Dica: rode com -FixPgVector para tentar instalar automaticamente"
            }
        }

        $tables = docker exec gestoradv-postgres psql -U gestoradv -d gestoradv -tAc 'SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN (''knowledge_faqs'',''knowledge_documents'');' 2>$null
        $tables = [int](($tables -join "").Trim())
        if ($tables -ge 2) {
            Write-Ok "Tabelas de conhecimento (knowledge_faqs, knowledge_documents) existem"
            Add-Result "ok"
        } else {
            Write-Warn "Tabelas de conhecimento ausentes. Rode: pnpm db:push"
            Add-Result "warn"
        }

        $faqCount = docker exec gestoradv-postgres psql -U gestoradv -d gestoradv -tAc "SELECT COUNT(*) FROM knowledge_faqs;" 2>$null
        $faqCount = [int](($faqCount -join "").Trim())
        if ($faqCount -gt 0) {
            Write-Ok "FAQs cadastradas: $faqCount"
            Add-Result "ok"
        } else {
            Write-Warn "Nenhuma FAQ no banco - suba a API uma vez (seed automatico) ou cadastre na UI"
            Add-Result "warn"
        }
    } catch {
        Write-Fail "Erro ao verificar PostgreSQL: $_"
        Add-Result "fail"
    }
} else {
    Write-Warn "PostgreSQL container parado - pulando verificacao de banco"
    Add-Result "warn"
}

# --- 5. Redis ---
Write-Info "5/9 Redis"

$redisRunning = docker ps --filter "name=gestoradv-redis" --filter "status=running" -q 2>$null
if ($redisRunning) {
    $redisPing = docker exec gestoradv-redis redis-cli ping 2>$null
    if ($redisPing -match "PONG") {
        Write-Ok "Redis respondendo (filas BullMQ: prazos, SLA, tribunal-sync)"
        Add-Result "ok"
    } else {
        Write-Fail "Redis nao responde"
        Add-Result "fail"
    }
} else {
    Write-Warn "Redis container parado"
    Add-Result "warn"
}

# --- 6. Dependencias Node ---
Write-Info "6/9 Dependencias do projeto"

$nodeModules = Join-Path $ProjectRoot "node_modules"
if (Test-Path $nodeModules) {
    Write-Ok "node_modules instalado"
    Add-Result "ok"
} else {
    Write-Warn "node_modules ausente. Rode: pnpm install"
    Add-Result "warn"
}

$apiDist = Join-Path $ProjectRoot "apps\api\dist"
if (Test-Path $apiDist) {
    Write-Ok "API compilada (apps/api/dist)"
    Add-Result "ok"
} else {
    Write-Warn "API nao compilada. Rode: pnpm --filter @gestor-adv/api build"
    Add-Result "warn"
}

# --- 7. Portas ---
Write-Info "7/9 Portas locais"

function Test-PortInUse($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return [bool]$conn
}

foreach ($p in @(
    @{ Port = 3000; Svc = "Frontend Next.js" },
    @{ Port = 3001; Svc = "API NestJS" },
    @{ Port = 5432; Svc = "PostgreSQL" },
    @{ Port = 6379; Svc = "Redis" }
)) {
    if (Test-PortInUse $p.Port) {
        Write-Ok "Porta $($p.Port) em uso - $($p.Svc)"
        Add-Result "ok"
    } else {
        Write-Warn "Porta $($p.Port) livre - $($p.Svc) provavelmente parado"
        Add-Result "warn"
    }
}

# --- 8. API health (opcional) ---
Write-Info "8/9 API (health check)"

$shouldTestApi = $TestApi -or (Test-PortInUse 3001)
if ($shouldTestApi) {
    try {
        $health = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get -TimeoutSec 5
        if ($health.status -eq "ok") {
            Write-Ok "API online - $ApiUrl/health"
            Add-Result "ok"
        } else {
            Write-Warn "API respondeu mas status inesperado: $($health | ConvertTo-Json -Compress)"
            Add-Result "warn"
        }
    } catch {
        Write-Warn "API nao responde em $ApiUrl - rode: pnpm dev"
        Add-Result "warn"
    }
} else {
    Write-Info "API nao testada (porta 3001 livre). Use -TestApi para forcar."
}

# --- 9. WhatsApp (opcional, requer JWT) ---
Write-Info "9/9 WhatsApp (teste opcional)"

if ($TestWhatsapp) {
    if (-not $JwtToken) {
        Write-Warn "TestWhatsapp requer -JwtToken (login no painel -> token JWT)"
        Add-Result "warn"
    } else {
        try {
            $headers = @{ Authorization = "Bearer $JwtToken" }
            $wa = Invoke-RestMethod -Uri "$ApiUrl/escritorio/integracoes/testar-whatsapp" -Method Post -Headers $headers -TimeoutSec 15
            if ($wa.success) {
                Write-Ok "WhatsApp: $($wa.message)"
                Add-Result "ok"
            } else {
                Write-Warn "WhatsApp: $($wa.message)"
                Add-Result "warn"
            }
        } catch {
            Write-Fail "Erro ao testar WhatsApp: $_"
            Add-Result "fail"
        }
    }
} else {
    $waEnv = $envVars["WHATSAPP_ACCESS_TOKEN"]
    if ($waEnv -and $waEnv -notmatch '^\s*$') {
        Write-Ok "Credenciais WhatsApp presentes no .env (use -TestWhatsapp -JwtToken para testar conexao)"
        Add-Result "ok"
    } else {
        Write-Info "WhatsApp nao configurado no .env - configure em Escritorio > Integracoes"
    }
}

# --- Resumo ---
Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host " RESUMO" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host "  OK    : $($results.passed)" -ForegroundColor Green
Write-Host "  Avisos: $($results.warned)" -ForegroundColor Yellow
Write-Host "  Falhas: $($results.failed)" -ForegroundColor Red
Write-Host ""

if ($results.failed -eq 0 -and $results.warned -eq 0) {
    Write-Host "Ambiente pronto! Rode: pnpm dev" -ForegroundColor Green
} elseif ($results.failed -eq 0) {
    Write-Host "Ambiente funcional com ressalvas. Revise os avisos acima." -ForegroundColor Yellow
} else {
    Write-Host "Corrija as falhas antes de desenvolver." -ForegroundColor Red
}

Write-Host ""
Write-Host "Proximos passos sugeridos:" -ForegroundColor Cyan
Write-Host "  1. pnpm docker:up          # subir Postgres + Redis + Mongo"
Write-Host "  2. pnpm db:push            # aplicar schema (FAQs, IA, etc.)"
Write-Host "  3. Editar .env             # ANTHROPIC_API_KEY + OPENAI_API_KEY"
Write-Host "  4. pnpm dev                # API :3001 + Web :3000"
Write-Host "  5. Escritorio > Integracoes > IA + WhatsApp"
Write-Host "  6. Escritorio > Base de Conhecimento > FAQs"
Write-Host ""
Write-Host "Opcoes do script:" -ForegroundColor Cyan
Write-Host "  -FixPgVector     tenta instalar extensao pgvector"
Write-Host "  -TestApi         testa /api/health mesmo se porta livre"
Write-Host "  -TestWhatsapp -JwtToken 'eyJ...'   testa Meta API"
Write-Host ""

if ($results.failed -gt 0) { exit 1 }
exit 0
