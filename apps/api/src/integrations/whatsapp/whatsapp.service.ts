import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private envAccessToken: string;
  private envPhoneNumberId: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.envAccessToken = this.config.get('WHATSAPP_ACCESS_TOKEN') || '';
    this.envPhoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  }

  private async getCredentials(): Promise<{ accessToken: string; phoneNumberId: string }> {
    try {
      const escritorio = await this.prisma.escritorio.findFirst({
        select: { whatsappAccessToken: true, whatsappPhoneNumberId: true },
      });

      if (escritorio?.whatsappAccessToken && escritorio?.whatsappPhoneNumberId) {
        return {
          accessToken: escritorio.whatsappAccessToken,
          phoneNumberId: escritorio.whatsappPhoneNumberId,
        };
      }
    } catch {
      /* DB not available, fall through to env */
    }

    return {
      accessToken: this.envAccessToken,
      phoneNumberId: this.envPhoneNumberId,
    };
  }

  async isConfigured(): Promise<boolean> {
    const creds = await this.getCredentials();
    return !!(creds.accessToken && creds.phoneNumberId);
  }

  async sendMessage(to: string, text: string): Promise<any> {
    const creds = await this.getCredentials();

    if (!creds.accessToken || !creds.phoneNumberId) {
      this.logger.debug(`[WhatsApp Mock] To: ${to} | Message: ${text}`);
      return { mock: true };
    }

    const apiUrl = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    return response.json();
  }

  async sendProcessoUpdate(to: string, processoNumero: string, atualizacao: string): Promise<any> {
    const text = `*Atualização do Processo ${processoNumero}*\n\n${atualizacao}\n\n_Qualquer dúvida, responda esta mensagem._`;
    return this.sendMessage(to, text);
  }
}
