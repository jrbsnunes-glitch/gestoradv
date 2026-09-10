import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const MASTER_SECRET = 'gestoradv-license-master-secret-2026';
const LICENSE_DURATION_DAYS = 30;

@Injectable()
export class EscritorioService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<any> {
    const escritorio = await this.prisma.escritorio.findFirst();
    if (!escritorio) return null;

    const {
      whatsappBusinessId, whatsappAccessToken, whatsappPhoneNumberId,
      whatsappVerifyToken, datajudApiKey, proxyUrl, twocaptchaApiKey,
      ...safeData
    } = escritorio;
    return safeData;
  }

  async upsert(data: any): Promise<any> {
    const existing = await this.prisma.escritorio.findFirst();

    if (existing) {
      return this.prisma.escritorio.update({
        where: { id: existing.id },
        data,
      });
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + LICENSE_DURATION_DAYS);
    const licencaChave = this.generateLicenseKey(data.cnpj, validUntil);

    return this.prisma.escritorio.create({
      data: {
        ...data,
        licencaChave,
        licencaValidade: validUntil,
        licencaPlano: 'trial',
        licencaAtiva: true,
        licencaUltimaValid: new Date(),
        licencaHistorico: [{ action: 'create', date: new Date().toISOString(), validUntil: validUntil.toISOString() }],
      },
    });
  }

  async getLicenseStatus(): Promise<any> {
    const escritorio = await this.prisma.escritorio.findFirst({
      select: {
        cnpj: true,
        razaoSocial: true,
        licencaChave: true,
        licencaValidade: true,
        licencaPlano: true,
        licencaAtiva: true,
        licencaUltimaValid: true,
      },
    });

    if (!escritorio) {
      return { active: false, reason: 'Escritório não configurado' };
    }

    const now = new Date();
    const expired = escritorio.licencaValidade && now > new Date(escritorio.licencaValidade);

    const lastValidation = escritorio.licencaUltimaValid ? new Date(escritorio.licencaUltimaValid) : null;
    const daysSinceValidation = lastValidation
      ? Math.floor((now.getTime() - lastValidation.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const needsRevalidation = daysSinceValidation === null || daysSinceValidation >= LICENSE_DURATION_DAYS;

    const daysRemaining = escritorio.licencaValidade
      ? Math.max(0, Math.ceil((new Date(escritorio.licencaValidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      active: escritorio.licencaAtiva && !expired,
      cnpj: escritorio.cnpj,
      razaoSocial: escritorio.razaoSocial,
      plano: escritorio.licencaPlano,
      validade: escritorio.licencaValidade,
      expired: !!expired,
      chave: escritorio.licencaChave,
      daysRemaining,
      needsRevalidation,
      daysSinceValidation,
      lastValidation: escritorio.licencaUltimaValid,
      licenseDurationDays: LICENSE_DURATION_DAYS,
    };
  }

  async activateLicense(cnpj: string, chave: string): Promise<any> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const escritorio = await this.prisma.escritorio.findUnique({ where: { cnpj: cleanCnpj } });
    if (!escritorio) throw new NotFoundException('Escritório não encontrado com este CNPJ');

    // Valida a chave para o mês atual ou próximo
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const validNow = chave === this.generateLicenseKey(cleanCnpj, now);
    const validNext = chave === this.generateLicenseKey(cleanCnpj, nextMonth);
    const validExisting = chave === escritorio.licencaChave;

    if (!validNow && !validNext && !validExisting) {
      return { success: false, message: 'Chave de licença inválida ou expirada para o período atual' };
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + LICENSE_DURATION_DAYS);

    const histEntry = { action: 'activate', date: now.toISOString(), validUntil: validUntil.toISOString(), chave };
    const currentHist = Array.isArray(escritorio.licencaHistorico) ? escritorio.licencaHistorico : [];

    await this.prisma.escritorio.update({
      where: { id: escritorio.id },
      data: {
        licencaChave: chave,
        licencaAtiva: true,
        licencaValidade: validUntil,
        licencaPlano: 'professional',
        licencaUltimaValid: now,
        licencaHistorico: [...currentHist, histEntry],
      },
    });

    return {
      success: true,
      message: `Licença ativada com sucesso. Válida até ${validUntil.toLocaleDateString('pt-BR')}`,
      validUntil,
    };
  }

  async checkAndRevalidate(): Promise<{ valid: boolean; message: string }> {
    const escritorio = await this.prisma.escritorio.findFirst();
    if (!escritorio) return { valid: true, message: 'Nenhum escritório cadastrado' };

    const now = new Date();

    if (!escritorio.licencaAtiva) {
      return { valid: false, message: 'Licença desativada' };
    }

    if (escritorio.licencaValidade && now > new Date(escritorio.licencaValidade)) {
      await this.prisma.escritorio.update({
        where: { id: escritorio.id },
        data: { licencaAtiva: false },
      });
      return { valid: false, message: 'Licença expirada. Necessário renovar.' };
    }

    // Verifica se a chave ainda é válida para o período atual
    if (escritorio.licencaChave && escritorio.cnpj) {
      const validForCurrent = escritorio.licencaChave === this.generateLicenseKey(escritorio.cnpj, now);
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const validForNext = escritorio.licencaChave === this.generateLicenseKey(escritorio.cnpj, nextMonth);

      if (validForCurrent || validForNext) {
        await this.prisma.escritorio.update({
          where: { id: escritorio.id },
          data: { licencaUltimaValid: now },
        });
        return { valid: true, message: 'Licença válida' };
      }
    }

    // Se chegou aqui, a chave é de período antigo
    const lastValid = escritorio.licencaUltimaValid ? new Date(escritorio.licencaUltimaValid) : null;
    const daysSince = lastValid ? Math.floor((now.getTime() - lastValid.getTime()) / (1000 * 60 * 60 * 24)) : 999;

    if (daysSince >= LICENSE_DURATION_DAYS) {
      return { valid: false, message: `Licença não revalidada há ${daysSince} dias. Insira uma nova chave.` };
    }

    return { valid: true, message: `Licença válida. Próxima revalidação em ${LICENSE_DURATION_DAYS - daysSince} dia(s).` };
  }

  // ==================== INTEGRAÇÕES ====================

  private readonly INTEGRATION_FIELDS = [
    'whatsappBusinessId',
    'whatsappAccessToken',
    'whatsappPhoneNumberId',
    'whatsappVerifyToken',
    'datajudApiKey',
    'proxyUrl',
    'twocaptchaApiKey',
    'aiProvider',
    'aiModel',
    'aiRagEnabled',
    'aiToolsEnabled',
    'aiSystemPrompt',
    'ollamaBaseUrl',
  ] as const;

  async getIntegracoes(): Promise<any> {
    const escritorio = await this.prisma.escritorio.findFirst({
      select: {
        whatsappBusinessId: true,
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
        whatsappVerifyToken: true,
        datajudApiKey: true,
        proxyUrl: true,
        twocaptchaApiKey: true,
        aiProvider: true,
        aiModel: true,
        aiRagEnabled: true,
        aiToolsEnabled: true,
        aiSystemPrompt: true,
        ollamaBaseUrl: true,
      },
    });

    if (!escritorio) {
      return {
        whatsapp: { configurado: false, businessId: null, accessToken: null, phoneNumberId: null, verifyToken: null },
        datajud: { configurado: false, apiKey: null },
        scraping: { configurado: false, proxyUrl: null, twocaptchaApiKey: null },
      };
    }

    const mask = (val: string | null): string | null =>
      val && val.length > 4 ? '****' + val.slice(-4) : val ? '****' : null;

    return {
      whatsapp: {
        configurado: !!(escritorio.whatsappAccessToken && escritorio.whatsappPhoneNumberId),
        businessId: mask(escritorio.whatsappBusinessId),
        accessToken: mask(escritorio.whatsappAccessToken),
        phoneNumberId: mask(escritorio.whatsappPhoneNumberId),
        verifyToken: mask(escritorio.whatsappVerifyToken),
      },
      datajud: {
        configurado: !!escritorio.datajudApiKey,
        apiKey: mask(escritorio.datajudApiKey),
      },
      scraping: {
        configurado: !!(escritorio.proxyUrl || escritorio.twocaptchaApiKey),
        proxyUrl: escritorio.proxyUrl || null,
        twocaptchaApiKey: mask(escritorio.twocaptchaApiKey),
      },
      ai: {
        provider: escritorio.aiProvider || 'anthropic',
        model: escritorio.aiModel || null,
        ragEnabled: escritorio.aiRagEnabled ?? true,
        toolsEnabled: escritorio.aiToolsEnabled ?? true,
        systemPrompt: escritorio.aiSystemPrompt || null,
        ollamaBaseUrl: escritorio.ollamaBaseUrl || null,
      },
    };
  }

  async updateIntegracoes(data: Record<string, string | boolean | null>): Promise<any> {
    const escritorio = await this.prisma.escritorio.findFirst();
    if (!escritorio) {
      return { success: false, message: 'Escritório não encontrado. Cadastre os dados do escritório primeiro.' };
    }

    const allowed = new Set<string>(this.INTEGRATION_FIELDS);
    const updateData: Record<string, string | boolean | null> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!allowed.has(key)) continue;
      if (key === 'aiRagEnabled' || key === 'aiToolsEnabled') {
        updateData[key] = value === true || value === 'true';
      } else {
        updateData[key] = (value as string) || null;
      }
    }

    await this.prisma.escritorio.update({
      where: { id: escritorio.id },
      data: updateData,
    });

    return { success: true, message: 'Integrações atualizadas com sucesso.' };
  }

  async getWhatsappCredentials(): Promise<{ accessToken: string | null; phoneNumberId: string | null; verifyToken: string | null }> {
    const escritorio = await this.prisma.escritorio.findFirst({
      select: {
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
        whatsappVerifyToken: true,
      },
    });

    return {
      accessToken: escritorio?.whatsappAccessToken || null,
      phoneNumberId: escritorio?.whatsappPhoneNumberId || null,
      verifyToken: escritorio?.whatsappVerifyToken || null,
    };
  }

  async getDatajudApiKey(): Promise<string | null> {
    const escritorio = await this.prisma.escritorio.findFirst({
      select: { datajudApiKey: true },
    });
    return escritorio?.datajudApiKey || null;
  }

  async testarWhatsapp(): Promise<any> {
    const creds = await this.getWhatsappCredentials();

    if (!creds.accessToken || !creds.phoneNumberId) {
      return { success: false, message: 'Credenciais do WhatsApp não configuradas. Preencha o Access Token e Phone Number ID.' };
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '0',
          type: 'text',
          text: { body: 'Teste de conexão GestorAdv' },
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        return { success: false, message: 'Access Token inválido ou expirado.' };
      }

      if (result.error?.code === 100 && result.error?.error_subcode === 2018109) {
        return { success: true, message: 'Conexão com a API do WhatsApp verificada com sucesso! (Token e Phone Number ID válidos)' };
      }

      if (result.error) {
        return { success: false, message: `Erro da API: ${result.error.message}` };
      }

      return { success: true, message: 'Conexão com a API do WhatsApp verificada com sucesso!' };
    } catch (err) {
      return { success: false, message: `Erro de conexão: ${(err as Error).message}` };
    }
  }

  getForDocument(): Promise<any> {
    return this.prisma.escritorio.findFirst({
      select: {
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        oabSocietaria: true,
        oabEstado: true,
        endereco: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        celular: true,
        email: true,
        website: true,
      },
    });
  }

  private generateLicenseKey(cnpj: string, date: Date): string {
    const clean = cnpj.replace(/\D/g, '');
    const period = date.toISOString().slice(0, 7);
    const payload = `${MASTER_SECRET}:${clean}:${period}`;
    const hash = crypto.createHmac('sha256', MASTER_SECRET).update(payload).digest('hex');
    const key = hash.substring(0, 32).toUpperCase();
    return `GA-${key.slice(0, 8)}-${key.slice(8, 16)}-${key.slice(16, 24)}-${key.slice(24, 32)}`;
  }
}
