import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async saveDocument(
    file: Express.Multer.File,
    autorId: string,
    data: { titulo: string; tipo?: string; processoId?: string },
  ): Promise<any> {
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.documento.create({
      data: {
        titulo: data.titulo,
        tipo: (data.tipo as any) || 'OUTRO',
        autorId,
        processoId: data.processoId || null,
        fileName: file.originalname,
        fileMime: file.mimetype,
        fileSize: file.size,
        fileUrl: `/uploads/${fileName}`,
      },
    });
  }

  async findByProcesso(processoId: string): Promise<any[]> {
    return this.prisma.documento.findMany({
      where: { processoId },
      include: { autor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(page = 1, limit = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.prisma.documento.findMany({
        skip,
        take: limit,
        include: {
          autor: { select: { name: true } },
          processo: { select: { numero: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documento.count(),
    ]);
    return { data: docs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  getFilePath(fileName: string): string {
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Arquivo não encontrado');
    return filePath;
  }
}
