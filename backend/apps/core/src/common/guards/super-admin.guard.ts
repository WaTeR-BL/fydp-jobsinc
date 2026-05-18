import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { JwtPayload } from '../../auth/types/jwt-payload.type';
import { AuthUserType } from '@app/common/enums/app.enums';

@Injectable()
export class SuperAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const user = context.switchToHttp().getRequest().user as JwtPayload;
        if (!user || user.userType !== AuthUserType.GLOBAL) {
            throw new ForbiddenException('Super admin access required');
        }
        return true;
    }
}
