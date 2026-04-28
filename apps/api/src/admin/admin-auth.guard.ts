import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de admin não fornecido');
    }

    const token = authHeader.split(' ')[1];
    const secret = this.configService.get<string>('ADMIN_JWT_SECRET', 'admin-jwt-secret-default');

    try {
      const payload = jwt.verify(token, secret) as any;
      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Token inválido para admin');
      }
      request.adminUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de admin inválido ou expirado');
    }
  }
}
