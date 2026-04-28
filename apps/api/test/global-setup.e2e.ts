import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export default async function globalSetup(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '../../..');
  const envTest = path.join(repoRoot, '.env.test');
  if (fs.existsSync(envTest)) {
    config({ path: envTest });
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret-change-me';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'e2e-admin-jwt-secret-change-me';
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  process.env.DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'standalone';

  if (process.env.SKIP_E2E_DB_PUSH === '1') {
    console.log('SKIP_E2E_DB_PUSH=1 — pulando prisma db push');
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  const masterUrl = process.env.MASTER_DATABASE_URL;
  if (!dbUrl || !masterUrl) {
    throw new Error(
      'E2E: defina DATABASE_URL e MASTER_DATABASE_URL. Copie .env.test.example para .env.test na raiz do monorepo.',
    );
  }

  const dbPkg = path.join(repoRoot, 'packages', 'database');
  execSync('pnpm exec prisma db push --skip-generate', {
    cwd: dbPkg,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  execSync('pnpm exec prisma db push --skip-generate --schema=prisma/master.prisma', {
    cwd: dbPkg,
    stdio: 'inherit',
    env: { ...process.env, MASTER_DATABASE_URL: masterUrl },
  });
}
