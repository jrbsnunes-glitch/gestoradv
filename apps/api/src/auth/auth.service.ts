import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterInput } from '@gestor-adv/validators';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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
}
