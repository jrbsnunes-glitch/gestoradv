#!/usr/bin/env node
/**
 * Gera os clients Prisma (tenant + master) após `pnpm install`.
 * Se DATABASE_URL / MASTER_DATABASE_URL não existirem (clone sem .env), usa placeholders
 * — o generate não conecta ao banco; as URLs só precisam ser sintaticamente válidas.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const prismaCli = resolve(pkgRoot, 'node_modules/prisma/build/index.js');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://gestoradv:gestoradv@127.0.0.1:5432/gestoradv_tenant?schema=public';
}
if (!process.env.MASTER_DATABASE_URL) {
  process.env.MASTER_DATABASE_URL =
    'postgresql://gestoradv:gestoradv@127.0.0.1:5432/gestoradv_master?schema=public';
}

function prisma(args) {
  const r = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: pkgRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

prisma(['generate']);
prisma(['generate', '--schema=prisma/master.prisma']);
