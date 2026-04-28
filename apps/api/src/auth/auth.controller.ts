import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
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
        'Este endpoint de login aceita apenas POST com Content-Type: application/json. Exemplo de corpo: { "email": "admin@gestoradv.com", "password": "Admin@2026" }. Use a tela de login do sistema ou POST /api/auth/login no Swagger (/api/docs).',
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login com email e senha' })
  async login(@Request() req: any, @Body() _dto: LoginDto) {
    return this.authService.login(req.user);
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
