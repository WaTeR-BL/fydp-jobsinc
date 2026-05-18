import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '@app/common';
import { AuthProvider, UserRole } from '@app/common/enums/app.enums';

@Injectable()
export class SeedService implements OnModuleInit {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
    ) {}

    async onModuleInit() {
        await this.seedSuperAdmin();
    }

    private async seedSuperAdmin() {
        const existing = await this.userModel.findOne({
            emailAddress: 'admin@jobsinc.ai',
        });
        if (existing) return;

        const defaultPassword = 'Abc!23';
        const password = await bcrypt.hash(defaultPassword, 10);

        await this.userModel.create({
            emailAddress: 'admin@jobsinc.ai',
            name: 'JobsInc Admin',
            roles: [UserRole.SUPER_ADMIN],
            authProvider: AuthProvider.LOCAL,
            password,
            timezone: 'Asia/Karachi',
            enable2FA: true,
            status: true,
            isDeleted: false,
        });
    }
}
