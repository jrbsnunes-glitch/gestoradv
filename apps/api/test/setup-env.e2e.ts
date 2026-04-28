import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

const repoRoot = path.resolve(__dirname, '../../..');
const envTest = path.join(repoRoot, '.env.test');
if (fs.existsSync(envTest)) {
  config({ path: envTest });
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret-change-me';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'e2e-admin-jwt-secret-change-me';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
process.env.DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'standalone';
