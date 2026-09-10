import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureE2EApp } from './configure-app.e2e';

const E2E_EMAIL = 'e2e-user@gestoradv.test';
const E2E_PASSWORD = 'E2ETest!123';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não definido (carregue .env.test — ver .env.test.example).');
    }

    prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });
    await prisma.user.create({
      data: {
        email: E2E_EMAIL,
        name: 'E2E User',
        password: await bcrypt.hash(E2E_PASSWORD, 10),
        role: 'ADMIN',
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureE2EApp(app);
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200).expect((res) => {
      expect(res.body.status).toBe('ok');
    });
  });

  it('POST /api/auth/login credenciais inválidas', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ tenantSlug: 'gestoradv', username: 'e2e-user', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /api/auth/login sucesso', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ tenantSlug: 'gestoradv', username: 'e2e-user', password: E2E_PASSWORD })
      .expect(201)
      .expect((res) => {
        expect(res.body.access_token).toBeDefined();
        expect(res.body.user?.email).toBe(E2E_EMAIL);
      });
  });

  it('GET /api/users com JWT', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ tenantSlug: 'gestoradv', username: 'e2e-user', password: E2E_PASSWORD });
    const token = login.body.access_token as string;

    return request(app.getHttpServer())
      .get('/api/users?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });
});
