import { Types } from 'mongoose';

export class GetUserDocument {
    _id: Types.ObjectId;
    name: string;
    emailAddress: string;
    roles: number[];
    status: boolean;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
