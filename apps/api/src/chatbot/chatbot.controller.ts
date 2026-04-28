import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  @Post('triagem')
  @ApiOperation({ summary: 'Chat de triagem jurídica com IA' })
  async triagem(@Body() body: { messages: Array<{ role: string; content: string }> }): Promise<any> {
    const reply = await this.chatbotService.triagem(body.messages);
    return { reply };
  }

  @Post('gerar-peca')
  @ApiOperation({ summary: 'Gerar peça jurídica com IA' })
  async gerarPeca(@Body() body: { tipo: string; parteAutora: string; parteRe: string; fatos: string; pedidos: string }): Promise<any> {
    const markdown = await this.chatbotService.gerarPeca(body);
    return { markdown };
  }
}
