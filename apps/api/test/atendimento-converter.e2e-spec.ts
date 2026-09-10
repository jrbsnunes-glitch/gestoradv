import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureE2EApp } from './configure-app.e2e';

const ADMIN_EMAIL = 'e2e-funil-admin@gestoradv.test';
const ADMIN_PASSWORD = 'E2EFunilAdmin!123';
const ADV_EMAIL = 'e2e-funil-adv@gestoradv.test';
const CLIENT_EMAIL = 'e2e-funil-cliente@gestoradv.test';

describe('Funil Atendimento -> Processo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let advId: string;
  let clienteProfileId: string;

  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { email: { in: [ADMIN_EMAIL, ADV_EMAIL, CLIENT_EMAIL] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    await prisma.atendimentoMensagem.deleteMany({
      where: {
        OR: [
          { atendimento: { telefone: { startsWith: '+5599E2EFUNIL' } } },
          { atendimento: { responsavelId: { in: userIds } } },
        ],
      },
    });
    await prisma.atendimento.deleteMany({
      where: {
        OR: [
          { telefone: { startsWith: '+5599E2EFUNIL' } },
          { responsavelId: { in: userIds } },
          { cliente: { user: { email: CLIENT_EMAIL } } },
        ],
      },
    });
    await prisma.tarefa.deleteMany({
      where: {
        OR: [
          { titulo: { contains: 'E2EFUNIL' } },
          { responsavelId: { in: userIds } },
        ],
      },
    });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.lancamento.deleteMany({ where: { criadoPorId: { in: userIds } } });
    await prisma.contaPagar.deleteMany({ where: { criadoPorId: { in: userIds } } });
    await prisma.documento.deleteMany({ where: { autorId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.processo.deleteMany({
      where: {
        OR: [
          { numero: { startsWith: 'E2EFUNIL-' } },
          { advogadoId: { in: userIds } },
          { cliente: { user: { email: CLIENT_EMAIL } } },
        ],
      },
    });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.client.deleteMany({ where: { user: { email: CLIENT_EMAIL } } });
    await prisma.user.deleteMany({
      where: { email: { in: [ADMIN_EMAIL, ADV_EMAIL, CLIENT_EMAIL] } },
    });
  }

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL nao definido. Carregue .env.test (ver .env.test.example).');
    }

    prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

    await cleanup();

    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: 'E2E Funil Admin',
        password: await bcrypt.hash(ADMIN_PASSWORD, 10),
        role: 'ADMIN',
      },
    });

    const adv = await prisma.user.create({
      data: {
        email: ADV_EMAIL,
        name: 'E2E Funil Advogado',
        password: await bcrypt.hash('Adv@2026', 10),
        role: 'ADVOGADO',
        especialidades: ['TRABALHISTA'],
      },
    });
    advId = adv.id;
    void admin;

    const cliente = await prisma.user.create({
      data: {
        email: CLIENT_EMAIL,
        name: 'E2E Cliente Funil',
        password: await bcrypt.hash('cliente@123', 10),
        role: 'CLIENTE',
        phone: '+5599E2EFUNIL2',
        clientProfile: {
          create: { consentLgpd: true, consentDate: new Date() },
        },
      },
      include: { clientProfile: true },
    });
    clienteProfileId = cliente.clientProfile!.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureE2EApp(app);
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ tenantSlug: 'gestoradv', username: 'e2e-funil-admin', password: ADMIN_PASSWORD });
    adminToken = login.body.access_token as string;
  });

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanup();
      } catch {}
      await prisma.$disconnect();
    }
    if (app) await app.close();
  });

  it('1) atendimento publico via formulario cria atendimento NOVO', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/atendimento/formulario')
      .send({
        nome: 'E2E Funil Lead',
        telefone: '+5599E2EFUNIL1',
        email: 'lead@e2efunil.test',
        mensagem: 'Caso de demissao sem justa causa, preciso ajuda.',
      })
      .expect(201);
    expect(res.body.protocolo).toBeDefined();
  });

  it('2) converter atendimento sem cliente deve falhar', async () => {
    const at = await prisma.atendimento.findFirst({
      where: { telefone: '+5599E2EFUNIL1' },
    });
    expect(at).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/atendimentos/${at!.id}/converter-em-processo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ numero: 'E2EFUNIL-001', tribunal: 'TRT1', advogadoId: advId })
      .expect(400);
  });

  it('3) vincular cliente existente ao atendimento', async () => {
    const at = await prisma.atendimento.findFirst({
      where: { telefone: '+5599E2EFUNIL1' },
    });

    await request(app.getHttpServer())
      .patch(`/api/atendimentos/${at!.id}/vincular-cliente`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ clienteId: clienteProfileId })
      .expect(200);

    const reloaded = await prisma.atendimento.findUnique({ where: { id: at!.id } });
    expect(reloaded?.clienteId).toBe(clienteProfileId);
  });

  it('4) converter em processo: cria processo + tarefa + notificacao', async () => {
    const at = await prisma.atendimento.findFirst({
      where: { telefone: '+5599E2EFUNIL1' },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/atendimentos/${at!.id}/converter-em-processo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        numero: 'E2EFUNIL-002',
        tribunal: 'TRT1',
        vara: '5a Vara',
        comarca: 'Rio de Janeiro',
        area: 'TRABALHISTA',
        valorCausa: 50000,
        advogadoId: advId,
      })
      .expect(201);

    expect(res.body.processo?.id).toBeDefined();
    expect(res.body.tarefa?.id).toBeDefined();

    const processoId = res.body.processo.id;

    const atUpdated = await prisma.atendimento.findUnique({ where: { id: at!.id } });
    expect(atUpdated?.status).toBe('CONVERTIDO');
    expect(atUpdated?.processoId).toBe(processoId);

    const tarefa = await prisma.tarefa.findFirst({
      where: { processoId, responsavelId: advId },
    });
    expect(tarefa).toBeTruthy();
    expect(tarefa?.prioridade).toBe('ALTA');

    const notificacao = await prisma.notification.findFirst({
      where: { userId: advId, type: 'PROCESSO_CRIADO_VIA_ATENDIMENTO' },
    });
    expect(notificacao).toBeTruthy();
  });

  it('5) tentativa de converter de novo deve falhar', async () => {
    const at = await prisma.atendimento.findFirst({
      where: { telefone: '+5599E2EFUNIL1' },
    });

    await request(app.getHttpServer())
      .post(`/api/atendimentos/${at!.id}/converter-em-processo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ numero: 'E2EFUNIL-003', tribunal: 'TRT1', advogadoId: advId })
      .expect(400);
  });

  it('6) marcar atendimento novo como perdido com motivo', async () => {
    await prisma.atendimento.deleteMany({ where: { telefone: '+5599E2EFUNIL3' } });
    await request(app.getHttpServer())
      .post('/api/atendimento/formulario')
      .send({
        nome: 'E2E Funil Lead Perdido',
        telefone: '+5599E2EFUNIL3',
        mensagem: 'Vou pensar e retorno.',
      })
      .expect(201);

    const at = await prisma.atendimento.findFirst({
      where: { telefone: '+5599E2EFUNIL3' },
    });
    expect(at).toBeTruthy();

    await request(app.getHttpServer())
      .patch(`/api/atendimentos/${at!.id}/marcar-perdido`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'cliente nao retornou' })
      .expect(200);

    const reloaded = await prisma.atendimento.findUnique({ where: { id: at!.id } });
    expect(reloaded?.status).toBe('PERDIDO');
    expect(reloaded?.motivoPerda).toBe('cliente nao retornou');
  });
});
