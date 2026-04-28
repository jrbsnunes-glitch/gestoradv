import { Controller, Post, Get, Param, Query, Body, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload de documento' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body('titulo') titulo: string,
    @Body('tipo') tipo?: string,
    @Body('processoId') processoId?: string,
  ): Promise<any> {
    return this.uploadService.saveDocument(file, userId, { titulo: titulo || file.originalname, tipo, processoId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string): Promise<any> {
    return this.uploadService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('processo/:processoId')
  @ApiOperation({ summary: 'Documentos de um processo' })
  async findByProcesso(@Param('processoId') processoId: string): Promise<any> {
    return this.uploadService.findByProcesso(processoId);
  }

  @Get('download/:fileName')
  @ApiOperation({ summary: 'Download de arquivo' })
  async download(@Param('fileName') fileName: string, @Res() res: Response): Promise<void> {
    const filePath = this.uploadService.getFilePath(fileName);
    res.download(filePath);
  }
}
