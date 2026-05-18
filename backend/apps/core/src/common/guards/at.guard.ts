import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { REQUIRE_TENANT_KEY } from '../decorators/require-tenant.decorator';
import { JwtPayload } from '../../auth/types/jwt-payload.type';
import { AuthUserType } from '@app/common/enums/app.enums';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AtGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    async canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (isPublic) return true;

        const ok = (await super.canActivate(context)) as boolean;
        if (!ok) return false;

        const requireTenant = this.reflector.getAllAndOverride<boolean>(
            REQUIRE_TENANT_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requireTenant) return true;

        const req = context.switchToHttp().getRequest();
        const user = req.user as JwtPayload;

        const isTenantUser =
            user.userType === AuthUserType.TENANT && !!user.tenantId;

        if (!isTenantUser) {
            throw new ForbiddenException('Tenant access required');
        }

        return true;
    }
}
