import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { RegisterInput } from '@gestor-adv/validators';
import { LoginDto } from './dto/auth.dto';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private masterPrisma: MasterPrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  async loginWithCredentials(dto: LoginDto) {
    const tenantSlug = dto.tenantSlug.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    const password = dto.password;

    if (!tenantSlug || !username || !password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.assertTenantSlug(tenantSlug);

    const mode = this.configService.get<string>('DEPLOYMENT_MODE', 'standalone');
    let user: any;

    if (mode === 'saas') {
      const tenant = await this.masterPrisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant || !tenant.isActive || tenant.isDeleted) {
        throw new UnauthorizedException('Escritório não encontrado');
      }
      const tenantDb = this.tenantPrisma.getClient(tenant.databaseUrl);
      user = await tenantDb.user.findFirst({
        where: {
          isActive: true,
          email: { startsWith: `${username}@`, mode: 'insensitive' },
        },
      });
    } else {
      user = await this.usersService.findByLoginUsername(username);
    }

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { password: _, ...result } = user;
    const session = await this.login(result);
    return { ...session, tenantSlug };
  }

  /** @deprecated Mantido para compatibilidade com LocalStrategy */
  async validateUser(email: string, password: string): Promise<any> {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!normalized || !password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const user = await this.usersService.findByEmail(normalized);
    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: { id: string; email: string; role: string }) {
    if (!user?.id || !user.email) {
      throw new UnauthorizedException('Sessão inválida');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(data: RegisterInput) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await this.usersService.create({
      ...data,
      password: hashedPassword,
    });

    const { password: _, ...result } = user;
    return this.login(result);
  }

  private async assertTenantSlug(slug: string): Promise<void> {
    const mode = this.configService.get<string>('DEPLOYMENT_MODE', 'standalone');

    if (mode === 'saas') {
      const tenant = await this.masterPrisma.tenant.findUnique({ where: { slug } });
      if (!tenant || !tenant.isActive || tenant.isDeleted) {
        throw new UnauthorizedException('Escritório não encontrado');
      }
      return;
    }

    const escritorio = await this.prisma.escritorio.findFirst({
      select: { nomeFantasia: true, razaoSocial: true },
    });
    if (!escritorio) return;

    const allowed = this.buildAllowedSlugs(escritorio);
    if (allowed.length > 0 && !allowed.includes(slug)) {
      throw new UnauthorizedException('Escritório não encontrado');
    }
  }

  private buildAllowedSlugs(escritorio: {
    nomeFantasia?: string | null;
    razaoSocial?: string | null;
  }): string[] {
    const slugs = new Set<string>();
    for (const field of [escritorio.nomeFantasia, escritorio.razaoSocial]) {
      if (!field) continue;
      const full = slugify(field);
      if (!full) continue;
      slugs.add(full);
      for (const part of full.split('-')) {
        if (part.length >= 2) slugs.add(part);
      }
    }
    return [...slugs];
  }
}
