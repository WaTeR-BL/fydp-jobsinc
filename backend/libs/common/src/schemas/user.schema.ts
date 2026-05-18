import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { AuthProvider, UserRole } from '../enums/app.enums';
import mongoose, { Types } from 'mongoose';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { BaseModel } from '@app/common/schemas/base-model.schema';

export type UserDocument = User & Document;

@Schema({
    timestamps: true,
    collection: 'users',
    _id: true,
})
export class User extends BaseModel {
    _id?: Types.ObjectId;

    @Prop()
    name?: string;

    @Prop({ required: true, unique: true })
    emailAddress: string;

    @Prop({ default: true })
    status: boolean;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop({ required: true })
    password: string;

    @Prop({ required: false })
    avatarUrl?: string;

    @Prop({ required: false })
    hashedRefreshToken?: string;

    @Prop({ required: true, enum: AuthProvider, type: Number })
    authProvider: AuthProvider;

    @Prop({ type: [Number], required: true, enum: UserRole })
    roles: UserRole[];

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: false,
    })
    tenantId?: mongoose.Types.ObjectId;

    @Prop({ required: true })
    timezone: string;

    @Prop({ required: true })
    enable2FA: boolean;

    @Prop({ required: true, default: false })
    is2FAVerified: boolean;

    @Prop({ required: false })
    code?: string;

    @Prop({ required: false })
    qrCode?: string;

    @Prop({ required: false })
    resetPasswordToken?: string;

    @Prop({ required: false })
    resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(mongooseAggregatePaginate);
