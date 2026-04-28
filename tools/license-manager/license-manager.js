#!/usr/bin/env node

/**
 * GestorAdv License Manager
 * 
 * Ferramenta externa para gerar, validar e gerenciar licenças.
 * Roda fora do sistema principal — pode ser usado por um administrador
 * ou integrado em um painel de controle separado.
 * 
 * Uso:
 *   node license-manager.js generate  --cnpj 12345678000190 [--dias 30] [--plano professional]
 *   node license-manager.js validate  --cnpj 12345678000190 --chave GA-XXXX-...
 *   node license-manager.js list      (lista todas as licenças do banco)
 *   node license-manager.js revoke    --cnpj 12345678000190
 *   node license-manager.js renew     --cnpj 12345678000190 [--dias 30]
 *   node license-manager.js info      --cnpj 12345678000190
 */

const crypto = require('crypto');
const { Client } = require('pg');

const MASTER_SECRET = 'gestoradv-license-master-secret-2026';
const DEFAULT_DAYS = 30;

const DB_URL = process.env.DATABASE_URL || 'postgresql://gestoradv:gestoradv_dev@localhost:5432/gestoradv';

// ========== ALGORITMO DE CHAVES ==========

function cleanCnpj(cnpj) {
  return cnpj.replace(/\D/g, '');
}

function generateLicenseKey(cnpj, validUntil) {
  const clean = cleanCnpj(cnpj);
  const period = validUntil.toISOString().slice(0, 7); // YYYY-MM
  const payload = `${MASTER_SECRET}:${clean}:${period}`;
  const hash = crypto.createHmac('sha256', MASTER_SECRET).update(payload).digest('hex');
  const key = hash.substring(0, 32).toUpperCase();
  return `GA-${key.slice(0, 8)}-${key.slice(8, 16)}-${key.slice(16, 24)}-${key.slice(24, 32)}`;
}

function validateLicenseKey(cnpj, chave, validUntil) {
  const expected = generateLicenseKey(cnpj, validUntil);
  return chave === expected;
}

function generateKeyForPeriods(cnpj, fromDate, months) {
  const keys = [];
  for (let i = 0; i < months; i++) {
    const date = new Date(fromDate);
    date.setMonth(date.getMonth() + i);
    keys.push({
      period: date.toISOString().slice(0, 7),
      key: generateLicenseKey(cnpj, date),
    });
  }
  return keys;
}

// ========== DATABASE ==========

async function getDbClient() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

// ========== COMMANDS ==========

async function cmdGenerate(args) {
  const cnpj = args.cnpj;
  if (!cnpj) { console.error('Erro: --cnpj é obrigatório'); process.exit(1); }

  const dias = parseInt(args.dias || DEFAULT_DAYS);
  const plano = args.plano || 'professional';

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + dias);

  const chave = generateLicenseKey(cnpj, validUntil);

  console.log('\n========================================');
  console.log('  GESTORADV - NOVA LICENÇA GERADA');
  console.log('========================================');
  console.log(`  CNPJ:       ${cleanCnpj(cnpj)}`);
  console.log(`  Plano:      ${plano.toUpperCase()}`);
  console.log(`  Válida até: ${validUntil.toLocaleDateString('pt-BR')}`);
  console.log(`  Período:    ${validUntil.toISOString().slice(0, 7)}`);
  console.log('----------------------------------------');
  console.log(`  CHAVE: ${chave}`);
  console.log('========================================\n');

  // Salvar no banco se possível
  try {
    const db = await getDbClient();
    const result = await db.query('SELECT id FROM escritorios WHERE cnpj = $1', [cleanCnpj(cnpj)]);

    if (result.rows.length > 0) {
      const id = result.rows[0].id;
      const historico = JSON.stringify({
        action: 'generate',
        date: new Date().toISOString(),
        validUntil: validUntil.toISOString(),
        plano,
        chave,
      });

      await db.query(`
        UPDATE escritorios SET 
          licenca_chave = $1,
          licenca_validade = $2,
          licenca_plano = $3,
          licenca_ativa = true,
          licenca_ultima_valid = NOW(),
          licenca_historico = COALESCE(licenca_historico, '[]'::jsonb) || $4::jsonb,
          updated_at = NOW()
        WHERE id = $5
      `, [chave, validUntil, plano, `[${historico}]`, id]);

      console.log('✓ Licença salva no banco de dados do sistema.');
    } else {
      console.log('⚠ Escritório não encontrado no banco. A chave foi gerada mas não salva.');
      console.log('  O admin deve inserir a chave manualmente no sistema.');
    }

    await db.end();
  } catch (err) {
    console.log('⚠ Não foi possível conectar ao banco de dados.');
    console.log('  Entregue a chave acima ao administrador do sistema.');
  }
}

async function cmdValidate(args) {
  const cnpj = args.cnpj;
  const chave = args.chave;
  if (!cnpj || !chave) { console.error('Erro: --cnpj e --chave são obrigatórios'); process.exit(1); }

  // Tenta validar para o mês atual e próximo
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const validNow = validateLicenseKey(cnpj, chave, now);
  const validNext = validateLicenseKey(cnpj, chave, nextMonth);

  console.log('\n========================================');
  console.log('  GESTORADV - VALIDAÇÃO DE LICENÇA');
  console.log('========================================');
  console.log(`  CNPJ:  ${cleanCnpj(cnpj)}`);
  console.log(`  Chave: ${chave}`);
  console.log('----------------------------------------');

  if (validNow) {
    console.log(`  ✓ VÁLIDA para o período atual (${now.toISOString().slice(0, 7)})`);
  } else if (validNext) {
    console.log(`  ✓ VÁLIDA para o próximo período (${nextMonth.toISOString().slice(0, 7)})`);
  } else {
    console.log('  ✗ INVÁLIDA ou EXPIRADA');
    // Tenta descobrir para qual período era
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i);
      if (validateLicenseKey(cnpj, chave, d)) {
        console.log(`  → Esta chave era válida para: ${d.toISOString().slice(0, 7)}`);
        break;
      }
    }
  }
  console.log('========================================\n');
}

async function cmdList() {
  try {
    const db = await getDbClient();
    const result = await db.query(`
      SELECT cnpj, razao_social, licenca_chave, licenca_validade, 
             licenca_plano, licenca_ativa, licenca_ultima_valid
      FROM escritorios 
      ORDER BY created_at DESC
    `);

    console.log('\n========================================');
    console.log('  GESTORADV - LICENÇAS CADASTRADAS');
    console.log('========================================');

    if (result.rows.length === 0) {
      console.log('  Nenhum escritório cadastrado.');
    } else {
      for (const row of result.rows) {
        const expired = row.licenca_validade && new Date() > new Date(row.licenca_validade);
        const status = !row.licenca_ativa ? 'DESATIVADA' : expired ? 'EXPIRADA' : 'ATIVA';
        const statusIcon = status === 'ATIVA' ? '✓' : '✗';

        console.log(`\n  ${statusIcon} ${row.razao_social || 'Sem nome'}`);
        console.log(`    CNPJ:       ${row.cnpj}`);
        console.log(`    Plano:      ${(row.licenca_plano || '-').toUpperCase()}`);
        console.log(`    Status:     ${status}`);
        console.log(`    Validade:   ${row.licenca_validade ? new Date(row.licenca_validade).toLocaleDateString('pt-BR') : '-'}`);
        console.log(`    Última val: ${row.licenca_ultima_valid ? new Date(row.licenca_ultima_valid).toLocaleDateString('pt-BR') : '-'}`);
        console.log(`    Chave:      ${row.licenca_chave || '-'}`);
      }
    }
    console.log('\n========================================\n');
    await db.end();
  } catch (err) {
    console.error('Erro ao conectar ao banco:', err.message);
  }
}

async function cmdRevoke(args) {
  const cnpj = args.cnpj;
  if (!cnpj) { console.error('Erro: --cnpj é obrigatório'); process.exit(1); }

  try {
    const db = await getDbClient();
    const result = await db.query(`
      UPDATE escritorios SET licenca_ativa = false, updated_at = NOW()
      WHERE cnpj = $1
      RETURNING razao_social
    `, [cleanCnpj(cnpj)]);

    if (result.rows.length > 0) {
      console.log(`\n✓ Licença REVOGADA para: ${result.rows[0].razao_social} (${cleanCnpj(cnpj)})\n`);
    } else {
      console.log('\n✗ Escritório não encontrado.\n');
    }
    await db.end();
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

async function cmdRenew(args) {
  const cnpj = args.cnpj;
  if (!cnpj) { console.error('Erro: --cnpj é obrigatório'); process.exit(1); }

  const dias = parseInt(args.dias || DEFAULT_DAYS);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + dias);
  const chave = generateLicenseKey(cnpj, validUntil);

  try {
    const db = await getDbClient();
    const historico = JSON.stringify({
      action: 'renew',
      date: new Date().toISOString(),
      validUntil: validUntil.toISOString(),
      chave,
    });

    const result = await db.query(`
      UPDATE escritorios SET 
        licenca_chave = $1,
        licenca_validade = $2,
        licenca_ativa = true,
        licenca_ultima_valid = NOW(),
        licenca_historico = COALESCE(licenca_historico, '[]'::jsonb) || $3::jsonb,
        updated_at = NOW()
      WHERE cnpj = $4
      RETURNING razao_social
    `, [chave, validUntil, `[${historico}]`, cleanCnpj(cnpj)]);

    if (result.rows.length > 0) {
      console.log('\n========================================');
      console.log('  GESTORADV - LICENÇA RENOVADA');
      console.log('========================================');
      console.log(`  Escritório: ${result.rows[0].razao_social}`);
      console.log(`  CNPJ:       ${cleanCnpj(cnpj)}`);
      console.log(`  Nova valid.: ${validUntil.toLocaleDateString('pt-BR')}`);
      console.log(`  CHAVE:      ${chave}`);
      console.log('========================================\n');
    } else {
      console.log('\n✗ Escritório não encontrado.\n');
    }
    await db.end();
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

async function cmdInfo(args) {
  const cnpj = args.cnpj;
  if (!cnpj) { console.error('Erro: --cnpj é obrigatório'); process.exit(1); }

  try {
    const db = await getDbClient();
    const result = await db.query(`
      SELECT * FROM escritorios WHERE cnpj = $1
    `, [cleanCnpj(cnpj)]);

    if (result.rows.length === 0) {
      console.log('\n✗ Escritório não encontrado.\n');
    } else {
      const e = result.rows[0];
      console.log('\n========================================');
      console.log('  GESTORADV - INFO DO ESCRITÓRIO');
      console.log('========================================');
      console.log(`  Razão Social:  ${e.razao_social}`);
      console.log(`  Nome Fantasia: ${e.nome_fantasia || '-'}`);
      console.log(`  CNPJ:          ${e.cnpj}`);
      console.log(`  Cidade/UF:     ${e.cidade || '-'}/${e.estado || '-'}`);
      console.log('----------------------------------------');
      console.log(`  Licença Ativa: ${e.licenca_ativa ? 'SIM' : 'NÃO'}`);
      console.log(`  Plano:         ${(e.licenca_plano || '-').toUpperCase()}`);
      console.log(`  Validade:      ${e.licenca_validade ? new Date(e.licenca_validade).toLocaleDateString('pt-BR') : '-'}`);
      console.log(`  Última valid.: ${e.licenca_ultima_valid ? new Date(e.licenca_ultima_valid).toLocaleDateString('pt-BR') : '-'}`);
      console.log(`  Chave:         ${e.licenca_chave || '-'}`);

      if (e.licenca_historico) {
        const hist = Array.isArray(e.licenca_historico) ? e.licenca_historico : [];
        if (hist.length > 0) {
          console.log('----------------------------------------');
          console.log('  Histórico (últimos 5):');
          hist.slice(-5).forEach(h => {
            console.log(`    ${h.date?.slice(0, 10)} | ${h.action} | até ${h.validUntil?.slice(0, 10)}`);
          });
        }
      }
      console.log('========================================\n');
    }
    await db.end();
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

// ========== MAIN ==========

function parseArgs(argv) {
  const args = {};
  const command = argv[2];
  for (let i = 3; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] || true;
      i++;
    }
  }
  return { command, args };
}

async function main() {
  const { command, args } = parseArgs(process.argv);

  console.log('\n🔑 GestorAdv License Manager v1.0\n');

  switch (command) {
    case 'generate': return cmdGenerate(args);
    case 'validate': return cmdValidate(args);
    case 'list':     return cmdList();
    case 'revoke':   return cmdRevoke(args);
    case 'renew':    return cmdRenew(args);
    case 'info':     return cmdInfo(args);
    default:
      console.log('Uso:');
      console.log('  node license-manager.js generate  --cnpj <CNPJ> [--dias 30] [--plano professional]');
      console.log('  node license-manager.js validate  --cnpj <CNPJ> --chave <CHAVE>');
      console.log('  node license-manager.js list');
      console.log('  node license-manager.js revoke    --cnpj <CNPJ>');
      console.log('  node license-manager.js renew     --cnpj <CNPJ> [--dias 30]');
      console.log('  node license-manager.js info      --cnpj <CNPJ>');
      console.log('');
      console.log('Variáveis de ambiente:');
      console.log('  DATABASE_URL  (default: postgresql://gestoradv:gestoradv_dev@localhost:5432/gestoradv)');
      console.log('');
  }
}

main().catch(console.error);
