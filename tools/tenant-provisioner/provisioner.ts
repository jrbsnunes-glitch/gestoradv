import { Client } from 'pg';
import { execSync } from 'child_process';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';

export interface ProvisionInput {
  slug: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  email: string;
  telefone?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface ProvisionResult {
  databaseName: string;
  databaseUrl: string;
  adminCreated: boolean;
}

export async function provisionTenantDatabase(input: ProvisionInput): Promise<ProvisionResult> {
  const dbHost = process.env.TENANT_DB_HOST || 'localhost';
  const dbPort = process.env.TENANT_DB_PORT || '5432';
  const dbUser = process.env.TENANT_DB_USER || 'gestoradv';
  const dbPassword = process.env.TENANT_DB_PASSWORD || 'gestoradv_dev';

  const databaseName = `gestoradv_${input.slug.replace(/[^a-z0-9_]/g, '_')}`;
  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${databaseName}`;

  const adminClient = new Client({
    host: dbHost,
    port: parseInt(dbPort),
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    await adminClient.connect();

    const existing = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if (existing.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE "${databaseName}" OWNER "${dbUser}"`);
    }
  } finally {
    await adminClient.end();
  }

  const schemaPath = resolve(__dirname, '../../packages/database/prisma/schema.prisma');
  execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  const { PrismaClient } = require('@gestor-adv/database');
  const tenantPrisma = new PrismaClient({ datasourceUrl: databaseUrl });

  let adminCreated = false;
  try {
    const existingAdmin = await tenantPrisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(input.adminPassword, 10);
      await tenantPrisma.user.create({
        data: {
          email: input.adminEmail,
          name: input.adminName,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      adminCreated = true;
    }
  } finally {
    await tenantPrisma.$disconnect();
  }

  return { databaseName, databaseUrl, adminCreated };
}

export async function deprovisionTenantDatabase(slug: string): Promise<void> {
  const dbHost = process.env.TENANT_DB_HOST || 'localhost';
  const dbPort = process.env.TENANT_DB_PORT || '5432';
  const dbUser = process.env.TENANT_DB_USER || 'gestoradv';
  const dbPassword = process.env.TENANT_DB_PASSWORD || 'gestoradv_dev';

  const databaseName = `gestoradv_${slug.replace(/[^a-z0-9_]/g, '_')}`;

  const adminClient = new Client({
    host: dbHost,
    port: parseInt(dbPort),
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    await adminClient.connect();

    await adminClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()
    `);

    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  } finally {
    await adminClient.end();
  }
}
