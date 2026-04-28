import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EscritorioService } from './escritorio.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';

export const SKIP_LICENSE_KEY = 'skipLicense';

@Injectable()
export class LicenseGuard implements CanActivate {
  private lastCheck: Date | null = null;
  private lastResult: { valid: boolean; message: string } | null = null;
  private readonly CACHE_MINUTES = 5;
  private readonly deploymentMode: string;

  constructor(
    private escritorioService: EscritorioService,
    private reflector: Reflector,
    private configService: ConfigService,
    @Optional() private masterPrisma?: MasterPrismaService,
  ) {
    this.deploymentMode = this.configService.get<string>('DEPLOYMENT_MODE', 'standalone');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipLicense = this.reflector.getAllAndOverride<boolean>(SKIP_LICENSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipLicense) return true;

    const path = context.switchToHttp().getRequest().path;
    const openPaths = ['/api/health', '/api/auth', '/api/escritorio', '/api/webhooks', '/api/atendimento/formulario', '/api/admin'];
    if (openPaths.some((p) => path.startsWith(p))) return true;

    if (this.deploymentMode === 'saas') {
      return this.checkSaasLicense(context);
    }

    return this.checkStandaloneLicense();
  }

  private async checkStandaloneLicense(): Promise<boolean> {
    const now = new Date();
    if (this.lastCheck && this.lastResult) {
      const minutesSince = (now.getTime() - this.lastCheck.getTime()) / (1000 * 60);
      if (minutesSince < this.CACHE_MINUTES) {
        if (!this.lastResult.valid) {
          throw new ForbiddenException(this.lastResult.message);
        }
        return true;
      }
    }

    const result = await this.escritorioService.checkAndRevalidate();
    this.lastCheck = now;
    this.lastResult = result;

    if (!result.valid) {
      throw new ForbiddenException(result.message);
    }

    return true;
  }

  private async checkSaasLicense(context: ExecutionContext): Promise<boolean> {
    if (!this.masterPrisma) return true;

    const req = context.switchToHttp().getRequest();
    const tenantId = req.tenantId;

    if (!tenantId) return true;

    const license = await this.masterPrisma.tenantLicense.findUnique({
      where: { tenantId },
    });

    if (!license || !license.ativa) {
      throw new ForbiddenException('Licença não encontrada ou inativa. Contate o suporte.');
    }

    if (new Date() > license.validade) {
      throw new ForbiddenException('Licença expirada. Renove sua assinatura.');
    }

    return true;
  }
}
