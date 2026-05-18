import {
    Controller,
    Get,
    Put,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationFilterDto } from './dto/notification.dto';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('notifications')
export class NotificationController {
    constructor(private notificationService: NotificationService) {}

    @Get()
    async getNotifications(
        @Query() query: NotificationFilterDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.notificationService.findByUser(
            user['tenantId'],
            user['sub'],
            query,
        );
        return handleServiceResponse(result);
    }

    @Get('unread-count')
    async getUnreadCount(@Claims() user: JwtPayload) {
        const result = await this.notificationService.getUnreadCount(
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Put(':id/read')
    async markAsRead(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.notificationService.markAsRead(
            id,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Put('read-all')
    @HttpCode(HttpStatus.OK)
    async markAllAsRead(@Claims() user: JwtPayload) {
        const result = await this.notificationService.markAllAsRead(
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }
}
