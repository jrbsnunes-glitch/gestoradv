import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AtendimentoService } from './atendimento.service';

@ApiTags('Atendimento Público')
@Controller('atendimento')
export class AtendimentoPublicoController {
  constructor(private atendimentoService: AtendimentoService) {}

  @Post('formulario')
  @ApiOperation({ summary: 'Formulário público de contato (sem autenticação)' })
  async formulario(
    @Body() body: { nome: string; telefone?: string; email?: string; assunto?: string; mensagem: string },
  ) {
    const atendimento = await this.atendimentoService.create({
      nome: body.nome,
      telefone: body.telefone,
      email: body.email,
      canal: 'FORMULARIO',
      assunto: body.assunto,
      mensagem: body.mensagem,
    });

    return {
      message: 'Sua mensagem foi recebida com sucesso! Nossa equipe entrará em contato em breve.',
      protocolo: atendimento.id,
    };
  }
}
