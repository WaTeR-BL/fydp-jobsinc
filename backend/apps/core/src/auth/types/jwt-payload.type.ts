import { AuthUserType } from '@app/common/enums/app.enums';

export type JwtPayload = {
    tenantId?: string;
    sub: string;
    timezone: string;
    userType: AuthUserType;
};
