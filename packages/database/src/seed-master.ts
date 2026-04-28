import { PrismaClient } from '../generated/master';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Valores de referência: Enterprise R$ 697/mês + R$ 2.500 setup; escalonados para os planos inferiores. */
async function main() {
  console.log('Seeding master database...');

  const existingAdmin = await prisma.adminUser.findFirst();
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.create({
      data: {
        email: 'admin@gestoradv.com.br',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Admin user created: admin@gestoradv.com.br / admin123');
  }

  const plans = [
    {
      nome: 'trial',
      descricao: 'Avaliação 30 dias — sem cobrança de setup nem mensalidade',
      maxUsuarios: 3,
      maxProcessos: 50,
      maxArmazenamento: 512,
      whatsappAtivo: false,
      iaAtiva: false,
      precoMensal: 0,
      precoSetup: 0,
    },
    {
      nome: 'basico',
      descricao: 'Entrada — setup de configuração + mensalidade escalonada',
      maxUsuarios: 5,
      maxProcessos: 200,
      maxArmazenamento: 2048,
      whatsappAtivo: false,
      iaAtiva: false,
      precoMensal: 297,
      precoSetup: 890,
    },
    {
      nome: 'profissional',
      descricao: 'Completo com WhatsApp e IA — setup e mensalidade intermediários',
      maxUsuarios: 15,
      maxProcessos: 1000,
      maxArmazenamento: 10240,
      whatsappAtivo: true,
      iaAtiva: true,
      precoMensal: 447,
      precoSetup: 1690,
    },
    {
      nome: 'enterprise',
      descricao: 'Ilimitado com suporte dedicado — R$ 2.500 setup + R$ 697/mês',
      maxUsuarios: 999,
      maxProcessos: 99999,
      maxArmazenamento: 102400,
      whatsappAtivo: true,
      iaAtiva: true,
      precoMensal: 697,
      precoSetup: 2500,
    },
  ];

  for (const plan of plans) {
    await prisma.tenantPlan.upsert({
      where: { nome: plan.nome },
      update: plan,
      create: plan,
    });
    console.log(`Plan "${plan.nome}" upserted`);
  }

  console.log('Master seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
