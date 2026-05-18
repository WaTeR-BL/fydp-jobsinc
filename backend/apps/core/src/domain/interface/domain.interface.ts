import { Types } from 'mongoose';

export interface GetDomainDocument {
    _id: Types.ObjectId;
    title: string;
    description: string;
    status: boolean;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
