import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappBotService } from './whatsapp-bot.service';

@ApiTags('WhatsApp')
@Controller('webhooks/whatsapp')
export class WhatsappController {
  constructor(
    private botService: WhatsappBotService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private async getVerifyToken(): Promise<string> {
    try {
      const escritorio = await this.prisma.escritorio.findFirst({
        select: { whatsappVerifyToken: true },
      });
      if (escritorio?.whatsappVerifyToken) return escritorio.whatsappVerifyToken;
    } catch { /* fallback to env */ }

    return this.config.get('WHATSAPP_VERIFY_TOKEN') || '';
  }

  @Get()
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<any> {
    const verifyToken = await this.getVerifyToken();
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return 'Forbidden';
  }

  @Post()
  @ApiOperation({ summary: 'WhatsApp webhook receiver' })
  async receive(@Body() body: any): Promise<any> {
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const contacts = change?.value?.contacts || [];
        const messages = change?.value?.messages || [];
        for (const message of messages) {
          const telefone = message.from;
          const texto = message.text?.body;
          if (!telefone || !texto) continue;

          const contact = contacts.find((c: any) => c.wa_id === telefone);
          const nome = contact?.profile?.name;

          try {
            await this.botService.handle(telefone, texto, nome);
            console.log(`[WhatsApp Bot] Processado para ${nome || telefone}`);
          } catch (err: any) {
            console.error(`[WhatsApp Bot] Erro: ${err.message}`);
          }
        }
      }
    }
    return 'OK';
  }
}
