import { Prop } from '@nestjs/mongoose';

export class BaseModel {
    @Prop()
    createdBy?: string;

    @Prop()
    updatedBy?: string;
}
