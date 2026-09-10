import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByLoginUsername: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('standalone') } },
        {
          provide: PrismaService,
          useValue: {
            escritorio: {
              findFirst: jest.fn().mockResolvedValue({
                nomeFantasia: 'GestorAdv Demo',
                razaoSocial: 'GestorAdv Advocacia LTDA',
              }),
            },
          },
        },
        { provide: MasterPrismaService, useValue: { tenant: { findUnique: jest.fn() } } },
        { provide: TenantPrismaService, useValue: { getClient: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('deve retornar usuário quando credenciais são válidas', async () => {
      const mockUser = { id: '1', email: 'test@test.com', password: 'hashed', role: 'ADMIN', name: 'Test' };
      usersService.findByEmail!.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toEqual({ id: '1', email: 'test@test.com', role: 'ADMIN', name: 'Test' });
      expect(result).not.toHaveProperty('password');
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      usersService.findByEmail!.mockResolvedValue(null as any);
      await expect(service.validateUser('x@x.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando senha é inválida', async () => {
      usersService.findByEmail!.mockResolvedValue({ id: '1', email: 'x@x.com', password: 'h', role: 'ADMIN' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser('x@x.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('deve retornar access_token e user', async () => {
      const result = await service.login({ id: '1', email: 'test@test.com', role: 'ADMIN' });
      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toEqual({ id: '1', email: 'test@test.com', role: 'ADMIN' });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: '1', email: 'test@test.com', role: 'ADMIN' });
    });
  });

  describe('register', () => {
    it('deve registrar novo usuário e retornar token', async () => {
      usersService.findByEmail!.mockResolvedValue(null as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');
      usersService.create!.mockResolvedValue({ id: '2', email: 'new@test.com', password: 'hashed-pass', role: 'ADVOGADO', name: 'New' } as any);

      const result = await service.register({ email: 'new@test.com', password: 'Test@123', name: 'New' });
      expect(result).toHaveProperty('access_token');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('deve lançar ConflictException quando email já existe', async () => {
      usersService.findByEmail!.mockResolvedValue({ id: '1' } as any);
      await expect(service.register({ email: 'exist@test.com', password: 'p', name: 'N' })).rejects.toThrow(ConflictException);
    });
  });
});
