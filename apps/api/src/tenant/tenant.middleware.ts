import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContext } from './tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const skipPaths = ['/api/admin', '/api/health'];
    if (skipPaths.some((p) => req.path.startsWith(p))) {
      return next();
    }

    const slug = this.resolveSlug(req);
    if (!slug) {
      throw new ForbiddenException('Tenant não identificado. Use um subdomínio ou header X-Tenant-ID.');
    }

    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new ForbiddenException(`Tenant "${slug}" não encontrado.`);
    }

    if (!tenant.isActive || tenant.isDeleted) {
      throw new ForbiddenException('Este escritório está desativado. Contate o suporte.');
    }

    this.tenantContext.set({
      tenantId: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      databaseName: tenant.databaseName,
      cnpj: tenant.cnpj,
      isActive: tenant.isActive,
    });

    (req as any).tenantId = tenant.id;
    (req as any).tenantSlug = tenant.slug;

    next();
  }

  private resolveSlug(req: Request): string | null {
    const headerSlug = req.headers['x-tenant-id'] as string;
    if (headerSlug) return headerSlug;

    const host = req.hostname;
    if (host && host.includes('.')) {
      const parts = host.split('.');
      if (parts.length >= 3) {
        return parts[0];
      }
    }

    return null;
  }
}
