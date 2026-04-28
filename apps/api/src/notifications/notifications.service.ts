import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string, page = 1, limit = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      data: notifications,
      unreadCount: unread,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(userId: string, id: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async create(userId: string, data: { title: string; message: string; type: string; data?: any }): Promise<any> {
    return this.prisma.notification.create({
      data: { userId, ...data },
    });
  }
}
