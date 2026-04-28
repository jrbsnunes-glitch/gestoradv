import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.notificationsService.findByUser(userId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  async markAsRead(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<any> {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  async markAllAsRead(@CurrentUser('id') userId: string): Promise<any> {
    return this.notificationsService.markAllAsRead(userId);
  }
}
