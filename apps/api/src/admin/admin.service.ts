import { Injectable, ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Client } from 'pg';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private masterPrisma: MasterPrismaService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<any> {
    const admin = await this.masterPrisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.isActive) {
      throw new BadRequestException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      throw new BadRequestException('Credenciais inválidas');
    }

    const secret = this.configService.get<string>('ADMIN_JWT_SECRET', 'admin-jwt-secret-default');
    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, type: 'admin' },
      secret,
      { expiresIn: '8h' },
    );

    return {
      access_token: token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    };
  }

  // ==================== TENANTS ====================

  async listTenants(query: { search?: string; isActive?: string; planId?: string; page?: number; limit?: number }): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { isDeleted: false };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    if (query.planId) {
      where.planId = query.planId;
    }
    if (query.search) {
      where.OR = [
        { razaoSocial: { contains: query.search, mode: 'insensitive' } },
        { nomeFantasia: { contains: query.search, mode: 'insensitive' } },
        { cnpj: { contains: query.search } },
        { slug: { contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.masterPrisma.tenant.findMany({
        where,
        include: { license: true, plan: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.masterPrisma.tenant.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getTenant(id: string): Promise<any> {
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id },
      include: { license: true, plan: true },
    });
    if (!tenant) throw new NotFoundException('Escritório não encontrado');
    return tenant;
  }

  async createTenant(data: any): Promise<any> {
    const existingSlug = await this.masterPrisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existingSlug) throw new ConflictException('Slug já em uso');

    const existingCnpj = await this.masterPrisma.tenant.findUnique({ where: { cnpj: data.cnpj } });
    if (existingCnpj) throw new ConflictException('CNPJ já cadastrado');

    const dbHost = this.configService.get('TENANT_DB_HOST', 'localhost');
    const dbPort = this.configService.get('TENANT_DB_PORT', '5432');
    const dbUser = this.configService.get('TENANT_DB_USER', 'gestoradv');
    const dbPassword = this.configService.get('TENANT_DB_PASSWORD', 'gestoradv_dev');

    const databaseName = `gestoradv_${data.slug.replace(/[^a-z0-9_]/g, '_')}`;
    const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${databaseName}`;

    const pgClient = new Client({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPassword,
      database: 'postgres',
    });

    try {
      await pgClient.connect();
      const existing = await pgClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
      if (existing.rows.length === 0) {
        await pgClient.query(`CREATE DATABASE "${databaseName}" OWNER "${dbUser}"`);
        this.logger.log(`Database "${databaseName}" created`);
      }
    } finally {
      await pgClient.end();
    }

    try {
      const { execSync } = require('child_process');
      const schemaPath = require('path').resolve(__dirname, '../../../../packages/database/prisma/schema.prisma');
      execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
        timeout: 60000,
      });
      this.logger.log(`Schema applied to "${databaseName}"`);
    } catch (err) {
      this.logger.error(`Failed to apply schema to "${databaseName}": ${(err as Error).message}`);
      throw new BadRequestException('Falha ao aplicar schema no banco do tenant');
    }

    const { PrismaClient } = require('@gestor-adv/database');
    const tenantPrisma = new PrismaClient({ datasourceUrl: databaseUrl });
    try {
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
      await tenantPrisma.user.create({
        data: {
          email: data.adminEmail,
          name: data.adminName,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
    } finally {
      await tenantPrisma.$disconnect();
    }

    const chave = this.generateLicenseKey(data.cnpj);
    const validade = new Date();
    validade.setDate(validade.getDate() + 30);

    const tenant = await this.masterPrisma.tenant.create({
      data: {
        slug: data.slug,
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        email: data.email,
        telefone: data.telefone,
        databaseUrl,
        databaseName,
        planId: data.planId || null,
        license: {
          create: {
            chave,
            plano: 'trial',
            validade,
            ultimaValidacao: new Date(),
            historico: [{ acao: 'criacao', data: new Date().toISOString(), plano: 'trial' }],
          },
        },
      },
      include: { license: true, plan: true },
    });

    return tenant;
  }

  async updateTenant(id: string, data: any): Promise<any> {
    await this.getTenant(id);
    return this.masterPrisma.tenant.update({
      where: { id },
      data,
      include: { license: true, plan: true },
    });
  }

  async activateTenant(id: string): Promise<any> {
    return this.masterPrisma.tenant.update({
      where: { id },
      data: { isActive: true },
      include: { license: true, plan: true },
    });
  }

  async deactivateTenant(id: string): Promise<any> {
    return this.masterPrisma.tenant.update({
      where: { id },
      data: { isActive: false },
      include: { license: true, plan: true },
    });
  }

  // ==================== LICENSES ====================

  async getTenantLicense(tenantId: string): Promise<any> {
    const license = await this.masterPrisma.tenantLicense.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });
    if (!license) throw new NotFoundException('Licença não encontrada');
    return license;
  }

  async generateLicense(tenantId: string): Promise<any> {
    const tenant = await this.getTenant(tenantId);
    const chave = this.generateLicenseKey(tenant.cnpj);
    const validade = new Date();
    validade.setDate(validade.getDate() + 30);

    const existing = await this.masterPrisma.tenantLicense.findUnique({ where: { tenantId } });
    const historico = Array.isArray(existing?.historico) ? [...(existing.historico as any[])] : [];
    historico.push({ acao: 'geracao', data: new Date().toISOString(), chaveAnterior: existing?.chave });

    if (existing) {
      return this.masterPrisma.tenantLicense.update({
        where: { tenantId },
        data: { chave, validade, ativa: true, ultimaValidacao: new Date(), historico },
      });
    }

    return this.masterPrisma.tenantLicense.create({
      data: { tenantId, chave, validade, ultimaValidacao: new Date(), historico },
    });
  }

  async revokeLicense(tenantId: string): Promise<any> {
    const license = await this.masterPrisma.tenantLicense.findUnique({ where: { tenantId } });
    if (!license) throw new NotFoundException('Licença não encontrada');

    const historico = Array.isArray(license.historico) ? [...(license.historico as any[])] : [];
    historico.push({ acao: 'revogacao', data: new Date().toISOString() });

    return this.masterPrisma.tenantLicense.update({
      where: { tenantId },
      data: { ativa: false, historico },
    });
  }

  async renewLicense(tenantId: string, dias = 30): Promise<any> {
    const license = await this.masterPrisma.tenantLicense.findUnique({ where: { tenantId } });
    if (!license) throw new NotFoundException('Licença não encontrada');

    const baseDate = license.validade > new Date() ? license.validade : new Date();
    const novaValidade = new Date(baseDate);
    novaValidade.setDate(novaValidade.getDate() + dias);

    const historico = Array.isArray(license.historico) ? [...(license.historico as any[])] : [];
    historico.push({
      acao: 'renovacao',
      data: new Date().toISOString(),
      diasAdicionados: dias,
      validadeAnterior: license.validade.toISOString(),
    });

    return this.masterPrisma.tenantLicense.update({
      where: { tenantId },
      data: { validade: novaValidade, ativa: true, ultimaValidacao: new Date(), historico },
    });
  }

  // ==================== PLANS ====================

  async listPlans(): Promise<any> {
    return this.masterPrisma.tenantPlan.findMany({ orderBy: { precoMensal: 'asc' } });
  }

  async createPlan(data: any): Promise<any> {
    return this.masterPrisma.tenantPlan.create({ data });
  }

  async updatePlan(id: string, data: any): Promise<any> {
    return this.masterPrisma.tenantPlan.update({ where: { id }, data });
  }

  // ==================== DASHBOARD ====================

  async getDashboard(): Promise<any> {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in15days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTenants,
      activeTenants,
      inactiveTenants,
      trialTenants,
      expiring7,
      expiring15,
      expiring30,
      createdThisMonth,
      allLicenses,
      plans,
    ] = await Promise.all([
      this.masterPrisma.tenant.count({ where: { isDeleted: false } }),
      this.masterPrisma.tenant.count({ where: { isActive: true, isDeleted: false } }),
      this.masterPrisma.tenant.count({ where: { isActive: false, isDeleted: false } }),
      this.masterPrisma.tenantLicense.count({ where: { plano: 'trial', ativa: true } }),
      this.masterPrisma.tenantLicense.count({
        where: { ativa: true, validade: { lte: in7days, gte: now } },
      }),
      this.masterPrisma.tenantLicense.count({
        where: { ativa: true, validade: { lte: in15days, gte: now } },
      }),
      this.masterPrisma.tenantLicense.count({
        where: { ativa: true, validade: { lte: in30days, gte: now } },
      }),
      this.masterPrisma.tenant.count({
        where: { createdAt: { gte: startOfMonth }, isDeleted: false },
      }),
      this.masterPrisma.tenantLicense.findMany({
        where: { ativa: true },
        include: { tenant: { include: { plan: true } } },
      }),
      this.masterPrisma.tenantPlan.findMany(),
    ]);

    let receitaMensal = 0;
    for (const lic of allLicenses) {
      if (lic.tenant?.plan) {
        receitaMensal += Number(lic.tenant.plan.precoMensal);
      }
    }

    const licensesExpiradas = await this.masterPrisma.tenantLicense.count({
      where: { validade: { lt: now } },
    });

    return {
      tenants: { total: totalTenants, ativos: activeTenants, inativos: inactiveTenants, trial: trialTenants, criadosMes: createdThisMonth },
      licencas: { expirandoEm7dias: expiring7, expirandoEm15dias: expiring15, expirandoEm30dias: expiring30, expiradas: licensesExpiradas },
      financeiro: { receitaMensalEstimada: receitaMensal },
      planos: plans.map((p) => ({
        ...p,
        precoMensal: Number(p.precoMensal),
        precoSetup: Number(p.precoSetup ?? 0),
      })),
    };
  }

  // ==================== HELPERS ====================

  private generateLicenseKey(cnpj: string): string {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const secret = this.configService.get<string>('JWT_SECRET', 'default-secret');
    return crypto
      .createHmac('sha256', secret)
      .update(`${cnpj}:${monthKey}:${Date.now()}`)
      .digest('hex');
  }
}
