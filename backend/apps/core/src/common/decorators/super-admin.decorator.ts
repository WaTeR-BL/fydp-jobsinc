import { applyDecorators, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../guards/super-admin.guard';

export const SuperAdmin = () => applyDecorators(UseGuards(SuperAdminGuard));
