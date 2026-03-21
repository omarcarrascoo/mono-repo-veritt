import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }, @Query() query: ListNotificationsDto) {
    return this.notificationsService.list(user.id, query);
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }
}
