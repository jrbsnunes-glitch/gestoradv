import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { KnowledgeFaqService } from './knowledge-faq.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ADVOGADO', 'SECRETARIA')
export class KnowledgeController {
  constructor(private faqService: KnowledgeFaqService) {}

  @Get('faqs')
  listFaqs() {
    return this.faqService.findAll(false);
  }

  @Post('faqs')
  createFaq(@Body() body: { pergunta: string; resposta: string; categoria?: string }) {
    return this.faqService.create(body);
  }

  @Put('faqs/:id')
  updateFaq(
    @Param('id') id: string,
    @Body() body: Partial<{ pergunta: string; resposta: string; categoria: string; isActive: boolean }>,
  ) {
    return this.faqService.update(id, body);
  }

  @Delete('faqs/:id')
  removeFaq(@Param('id') id: string) {
    return this.faqService.remove(id);
  }

  @Get('documents')
  listDocuments() {
    return this.faqService.listDocuments();
  }

  @Post('documents')
  createDocument(
    @Body() body: { titulo: string; conteudo: string; tipo?: 'FAQ' | 'JURISPRUDENCIA' | 'MODELO_INTERNO' },
  ) {
    return this.faqService.createDocument(body);
  }
}
