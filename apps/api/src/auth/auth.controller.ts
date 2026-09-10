import { Controller, Post, Get, Body, HttpCode, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Abrir /api/auth/login na barra do navegador envia GET e gerava 404.
   * Resposta explícita orienta usar POST ou a tela de login do front.
   */
  @Get('login')
  @HttpCode(405)
  @Header('Allow', 'POST')
  @ApiOperation({
    summary: 'Não use GET — login é POST',
    description:
      'O navegador só faz GET ao digitar a URL. Use POST com JSON, Swagger ou http://localhost:3000/login',
  })
  loginGetNotAllowed() {
    return {
      statusCode: 405,
      error: 'Method Not Allowed',
      message:
        'Este endpoint de login aceita apenas POST com Content-Type: application/json. Exemplo: { "tenantSlug": "gestoradv", "username": "admin", "password": "Admin@2026" }. Use a tela de login do sistema ou POST /api/auth/login no Swagger (/api/docs).',
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login com slug do escritório, usuário e senha' })
  async login(@Body() dto: LoginDto) {
    return this.authService.loginWithCredentials(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register({
      ...dto,
      role: dto.role ?? 'CLIENTE',
    });
  }
}
