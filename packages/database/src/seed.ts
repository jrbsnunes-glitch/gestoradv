import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'path';

// Mesmo banco que a API (raiz do monorepo e apps/api — último sobrescreve).
config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../../apps/api/.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('Admin@2026', 12);
  const advPassword = await bcrypt.hash('Adv@2026', 12);

  // update sempre redefine senha — assim reexecutar o seed corrige credenciais de dev
  // (upsert com update: {} deixava senha antiga, ex. após registro manual com outro password).
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gestoradv.com' },
    update: {
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: 'admin@gestoradv.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const adv1 = await prisma.user.upsert({
    where: { email: 'joao.silva@gestoradv.com' },
    update: {
      password: advPassword,
      name: 'Dr. João Silva',
      role: 'ADVOGADO',
      oabNumber: '12345',
      oabState: 'SP',
      phone: '+5511999990001',
      isActive: true,
    },
    create: {
      email: 'joao.silva@gestoradv.com',
      name: 'Dr. João Silva',
      password: advPassword,
      role: 'ADVOGADO',
      oabNumber: '12345',
      oabState: 'SP',
      phone: '+5511999990001',
    },
  });

  const adv2 = await prisma.user.upsert({
    where: { email: 'maria.santos@gestoradv.com' },
    update: {
      password: advPassword,
      name: 'Dra. Maria Santos',
      role: 'ADVOGADO',
      oabNumber: '67890',
      oabState: 'RJ',
      phone: '+5521999990002',
      isActive: true,
    },
    create: {
      email: 'maria.santos@gestoradv.com',
      name: 'Dra. Maria Santos',
      password: advPassword,
      role: 'ADVOGADO',
      oabNumber: '67890',
      oabState: 'RJ',
      phone: '+5521999990002',
    },
  });

  const estagiario = await prisma.user.upsert({
    where: { email: 'pedro.costa@gestoradv.com' },
    update: {
      password: advPassword,
      name: 'Pedro Costa',
      role: 'ESTAGIARIO',
      phone: '+5511999990003',
      isActive: true,
    },
    create: {
      email: 'pedro.costa@gestoradv.com',
      name: 'Pedro Costa',
      password: advPassword,
      role: 'ESTAGIARIO',
      phone: '+5511999990003',
    },
  });

  const clientesData = [
    { name: 'Carlos Mendes', email: 'carlos.mendes@email.com', cpfCnpj: '123.456.789-00', phone: '+5511988881111', city: 'São Paulo', state: 'SP' },
    { name: 'Ana Paula Ferreira', email: 'ana.ferreira@email.com', cpfCnpj: '987.654.321-00', phone: '+5521988882222', city: 'Rio de Janeiro', state: 'RJ' },
    { name: 'Roberto Lima', email: 'roberto.lima@email.com', cpfCnpj: '456.789.123-00', phone: '+5531988883333', city: 'Belo Horizonte', state: 'MG' },
    { name: 'Fernanda Oliveira', email: 'fernanda.oliveira@email.com', cpfCnpj: '321.654.987-00', phone: '+5541988884444', city: 'Curitiba', state: 'PR' },
    { name: 'Empresa ABC Ltda', email: 'contato@empresaabc.com', cpfCnpj: '12.345.678/0001-90', phone: '+5511988885555', city: 'São Paulo', state: 'SP' },
  ];

  const clientes = [];
  for (const c of clientesData) {
    const clientPassword = await bcrypt.hash('Cliente@2026', 12);
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {
        password: clientPassword,
        name: c.name,
        role: 'CLIENTE',
        phone: c.phone,
        isActive: true,
      },
      create: {
        email: c.email,
        name: c.name,
        password: clientPassword,
        role: 'CLIENTE',
        phone: c.phone,
        clientProfile: {
          create: {
            cpfCnpj: c.cpfCnpj,
            city: c.city,
            state: c.state,
            consentLgpd: true,
            consentDate: new Date(),
            leadSource: 'seed',
          },
        },
      },
      include: { clientProfile: true },
    });
    clientes.push(user);
  }

  const processosData = [
    { numero: '0001234-56.2024.8.26.0100', tribunal: 'TJSP', vara: '1ª Vara Cível', comarca: 'São Paulo', area: 'CIVIL' as const, valorCausa: 150000, advogado: adv1, cliente: clientes[0], descricao: 'Ação de indenização por danos morais e materiais' },
    { numero: '0005678-90.2024.5.01.0001', tribunal: 'TRT1', vara: '2ª Vara do Trabalho', comarca: 'Rio de Janeiro', area: 'TRABALHISTA' as const, valorCausa: 80000, advogado: adv2, cliente: clientes[1], descricao: 'Reclamação trabalhista - horas extras e verbas rescisórias' },
    { numero: '0009012-34.2024.8.13.0001', tribunal: 'TJMG', vara: '3ª Vara de Família', comarca: 'Belo Horizonte', area: 'FAMILIA' as const, valorCausa: 0, advogado: adv1, cliente: clientes[2], descricao: 'Ação de divórcio consensual com partilha de bens' },
    { numero: '0003456-78.2024.8.16.0001', tribunal: 'TJPR', vara: '1ª Vara Criminal', comarca: 'Curitiba', area: 'PENAL' as const, valorCausa: 0, advogado: adv2, cliente: clientes[3], descricao: 'Defesa criminal - art. 155 CP' },
    { numero: '0007890-12.2024.8.26.0100', tribunal: 'TJSP', vara: '5ª Vara Cível', comarca: 'São Paulo', area: 'CONSUMIDOR' as const, valorCausa: 25000, advogado: adv1, cliente: clientes[4], descricao: 'Ação de rescisão contratual com devolução de valores' },
    { numero: '0002345-67.2025.8.26.0100', tribunal: 'TJSP', vara: '2ª Vara Cível', comarca: 'São Paulo', area: 'CIVIL' as const, valorCausa: 500000, advogado: adv1, cliente: clientes[0], descricao: 'Ação de cobrança - contrato de prestação de serviços' },
    { numero: '0006789-01.2025.5.01.0001', tribunal: 'TRT1', vara: '5ª Vara do Trabalho', comarca: 'Rio de Janeiro', area: 'TRABALHISTA' as const, valorCausa: 120000, advogado: adv2, cliente: clientes[1], descricao: 'Ação de reconhecimento de vínculo empregatício' },
  ];

  const processos = [];
  for (const p of processosData) {
    const processo = await prisma.processo.upsert({
      where: { numero: p.numero },
      update: {},
      create: {
        numero: p.numero,
        tribunal: p.tribunal,
        vara: p.vara,
        comarca: p.comarca,
        area: p.area,
        status: 'ATIVO',
        valorCausa: p.valorCausa,
        dataDistribuicao: new Date('2024-06-15'),
        descricao: p.descricao,
        advogadoId: p.advogado.id,
        clienteId: p.cliente.clientProfile!.id,
      },
    });
    processos.push(processo);
  }

  const now = new Date();
  const daysFromNow = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return date;
  };

  const prazosData = [
    { processoId: processos[0].id, descricao: 'Prazo para contestação', dataLimite: daysFromNow(2), urgencia: 'CRITICA' as const },
    { processoId: processos[0].id, descricao: 'Juntada de documentos', dataLimite: daysFromNow(5), urgencia: 'ALTA' as const },
    { processoId: processos[1].id, descricao: 'Audiência de conciliação', dataLimite: daysFromNow(10), urgencia: 'MEDIA' as const },
    { processoId: processos[1].id, descricao: 'Prazo para réplica', dataLimite: daysFromNow(1), urgencia: 'CRITICA' as const },
    { processoId: processos[2].id, descricao: 'Apresentação de acordo de partilha', dataLimite: daysFromNow(15), urgencia: 'MEDIA' as const },
    { processoId: processos[3].id, descricao: 'Prazo para alegações finais', dataLimite: daysFromNow(3), urgencia: 'ALTA' as const },
    { processoId: processos[4].id, descricao: 'Audiência de instrução', dataLimite: daysFromNow(20), urgencia: 'BAIXA' as const },
    { processoId: processos[5].id, descricao: 'Prazo para impugnação', dataLimite: daysFromNow(7), urgencia: 'ALTA' as const },
    { processoId: processos[6].id, descricao: 'Depoimento de testemunhas', dataLimite: daysFromNow(12), urgencia: 'MEDIA' as const },
    { processoId: processos[0].id, descricao: 'Prazo para recurso de apelação', dataLimite: daysFromNow(30), urgencia: 'MEDIA' as const },
  ];

  for (const p of prazosData) {
    await prisma.prazo.create({ data: p });
  }

  const movimentacoesData = [
    { processoId: processos[0].id, data: daysFromNow(-10), descricao: 'Petição inicial distribuída', tipo: 'DISTRIBUICAO' },
    { processoId: processos[0].id, data: daysFromNow(-5), descricao: 'Citação do réu realizada', tipo: 'CITACAO' },
    { processoId: processos[0].id, data: daysFromNow(-2), descricao: 'Intimação para contestação - prazo de 15 dias', tipo: 'INTIMACAO' },
    { processoId: processos[1].id, data: daysFromNow(-15), descricao: 'Reclamação trabalhista distribuída', tipo: 'DISTRIBUICAO' },
    { processoId: processos[1].id, data: daysFromNow(-8), descricao: 'Notificação da reclamada', tipo: 'CITACAO' },
    { processoId: processos[1].id, data: daysFromNow(-1), descricao: 'Audiência de conciliação designada', tipo: 'DESPACHO' },
    { processoId: processos[2].id, data: daysFromNow(-20), descricao: 'Ação de divórcio protocolada', tipo: 'DISTRIBUICAO' },
    { processoId: processos[3].id, data: daysFromNow(-30), descricao: 'Denúncia recebida', tipo: 'DISTRIBUICAO' },
    { processoId: processos[3].id, data: daysFromNow(-7), descricao: 'Réu citado para apresentar defesa', tipo: 'CITACAO' },
    { processoId: processos[4].id, data: daysFromNow(-12), descricao: 'Ação de rescisão distribuída', tipo: 'DISTRIBUICAO' },
    { processoId: processos[5].id, data: daysFromNow(-3), descricao: 'Ação de cobrança distribuída', tipo: 'DISTRIBUICAO' },
    { processoId: processos[6].id, data: daysFromNow(-18), descricao: 'Reclamação trabalhista ajuizada', tipo: 'DISTRIBUICAO' },
  ];

  for (const m of movimentacoesData) {
    await prisma.movimentacao.create({ data: m });
  }

  const tarefasData = [
    { processoId: processos[0].id, responsavelId: adv1.id, titulo: 'Elaborar contestação', descricao: 'Preparar contestação para ação cível', prioridade: 'URGENTE' as const, dataLimite: daysFromNow(2) },
    { processoId: processos[0].id, responsavelId: estagiario.id, titulo: 'Reunir documentos comprobatórios', descricao: 'Coletar notas fiscais e contratos', prioridade: 'ALTA' as const, dataLimite: daysFromNow(4) },
    { processoId: processos[1].id, responsavelId: adv2.id, titulo: 'Preparar para audiência', descricao: 'Revisar documentação trabalhista', prioridade: 'ALTA' as const, dataLimite: daysFromNow(9) },
    { processoId: processos[2].id, responsavelId: adv1.id, titulo: 'Elaborar acordo de partilha', descricao: 'Redigir minuta do acordo entre as partes', prioridade: 'MEDIA' as const, dataLimite: daysFromNow(14) },
    { processoId: processos[3].id, responsavelId: adv2.id, titulo: 'Elaborar alegações finais', prioridade: 'ALTA' as const, dataLimite: daysFromNow(3) },
    { responsavelId: adv1.id, titulo: 'Reunião com novo cliente', descricao: 'Avaliação de caso trabalhista', prioridade: 'MEDIA' as const, dataLimite: daysFromNow(1) },
    { responsavelId: estagiario.id, titulo: 'Pesquisa de jurisprudência', descricao: 'Buscar precedentes sobre danos morais no TJSP', prioridade: 'BAIXA' as const, dataLimite: daysFromNow(7) },
  ];

  for (const t of tarefasData) {
    await prisma.tarefa.create({ data: t });
  }

  console.log('Seed completed!');
  console.log('  Login dev: admin@gestoradv.com / Admin@2026 (reexecute o seed para resetar senhas)');
  console.log(`  DATABASE_URL em uso: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') ?? '(não definido)'}`);
  console.log(`  Users: ${await prisma.user.count()}`);
  console.log(`  Clients: ${await prisma.client.count()}`);
  console.log(`  Processos: ${await prisma.processo.count()}`);
  console.log(`  Prazos: ${await prisma.prazo.count()}`);
  console.log(`  Movimentacoes: ${await prisma.movimentacao.count()}`);
  console.log(`  Tarefas: ${await prisma.tarefa.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
