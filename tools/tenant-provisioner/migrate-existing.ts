/**
 * Script de Migração: Registra o escritório existente como primeiro tenant no Master DB.
 *
 * Uso: pnpm --filter @gestor-adv/database seed:migrate
 *   ou: cd packages/database && npx tsx ../../tools/tenant-provisioner/migrate-existing.ts
 */

import * as crypto from 'crypto';

async function migrate() {
  console.log('=== Migração: Registrar escritório existente no Master DB ===\n');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient: TenantPrismaClient } = require('@prisma/client');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient: MasterPrismaClient } = require('../../packages/database/generated/master');

  const tenantDb = new TenantPrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  const masterDb = new MasterPrismaClient({
    datasourceUrl: process.env.MASTER_DATABASE_URL,
  });

  try {
    const escritorio = await tenantDb.escritorio.findFirst();

    if (!escritorio) {
      console.log('Nenhum escritório encontrado no banco atual. Abortando.');
      return;
    }

    console.log(`Escritório encontrado: ${escritorio.razaoSocial} (${escritorio.cnpj})`);

    const slug = (escritorio.nomeFantasia || escritorio.razaoSocial)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const existingTenant = await masterDb.tenant.findFirst({
      where: { OR: [{ cnpj: escritorio.cnpj }, { slug }] },
    });

    if (existingTenant) {
      console.log(`Tenant já existe no master (slug: ${existingTenant.slug}). Pulando criação.`);
      console.log(`ID: ${existingTenant.id}`);
      return;
    }

    const trialPlan = await masterDb.tenantPlan.findUnique({ where: { nome: 'trial' } });

    const databaseUrl = process.env.DATABASE_URL!;
    const dbNameMatch = databaseUrl.match(/\/([^/?]+)(\?|$)/);
    const databaseName = dbNameMatch ? dbNameMatch[1] : 'gestoradv';

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const chave = crypto
      .createHmac('sha256', 'gestoradv-license-master-secret-2026')
      .update(`${escritorio.cnpj}:${monthKey}:${Date.now()}`)
      .digest('hex');

    const validade = escritorio.licencaValidade || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const tenant = await masterDb.tenant.create({
      data: {
        slug,
        cnpj: escritorio.cnpj,
        razaoSocial: escritorio.razaoSocial,
        nomeFantasia: escritorio.nomeFantasia,
        email: escritorio.email || 'admin@escritorio.com',
        telefone: escritorio.telefone,
        databaseUrl,
        databaseName,
        planId: trialPlan?.id || null,
        license: {
          create: {
            chave,
            plano: escritorio.licencaPlano || 'trial',
            ativa: escritorio.licencaAtiva ?? true,
            validade,
            ultimaValidacao: new Date(),
            historico: [
              { acao: 'migracao', data: new Date().toISOString(), origem: 'standalone' },
            ],
          },
        },
      },
      include: { license: true },
    });

    console.log('\n=== Migração concluída com sucesso! ===');
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Slug: ${tenant.slug}`);
    console.log(`Database: ${tenant.databaseName}`);
    console.log(`Licença: ${tenant.license?.chave.substring(0, 16)}...`);
    console.log(`Validade: ${tenant.license?.validade.toLocaleDateString('pt-BR')}`);
    console.log('\nPróximos passos:');
    console.log('1. Altere DEPLOYMENT_MODE=saas no .env (se quiser ativar multi-tenancy)');
    console.log(`2. Para acessar via subdomínio: configure DNS ${slug}.gestoradv.com.br`);
    console.log('3. Ou use o header X-Tenant-ID: ' + slug);
  } finally {
    await tenantDb.$disconnect();
    await masterDb.$disconnect();
  }
}

migrate().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
