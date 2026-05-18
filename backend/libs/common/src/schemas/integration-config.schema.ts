import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import mongoose from 'mongoose';
import { DbType, ExtraFieldType, RelationType } from '../enums/app.enums';

@Schema({ _id: false })
export class ColumnMapping {
    @Prop({ required: true })
    sourceField: string;

    @Prop({ required: true })
    targetColumn: string;

    @Prop({ default: false })
    required: boolean;

    @Prop({ type: mongoose.Schema.Types.Mixed, required: false, default: null })
    defaultValue?: any;
}

export const ColumnMappingSchema = SchemaFactory.createForClass(ColumnMapping);

@Schema({ _id: false })
export class ExtraFieldDef {
    @Prop({ required: true })
    fieldKey: string;

    @Prop({ required: true })
    label: string;

    @Prop({ required: true, enum: ExtraFieldType, type: String })
    fieldType: ExtraFieldType;

    @Prop({ type: [String], default: [] })
    options: string[];

    @Prop({ default: false })
    required: boolean;

    @Prop({ required: true })
    targetColumn: string;

    @Prop({ required: false })
    referenceTable?: string;

    @Prop({ required: false })
    referenceQuery?: string;

    @Prop({ required: false, default: 'id' })
    referenceIdField?: string;

    @Prop({ required: false, default: 'name' })
    referenceDisplayField?: string;
}

export const ExtraFieldDefSchema = SchemaFactory.createForClass(ExtraFieldDef);

@Schema({ _id: false })
export class RelationDef {
    @Prop({ required: true, enum: RelationType, type: String })
    type: RelationType;

    @Prop({ required: false })
    childTable?: string;

    @Prop({ required: false })
    foreignKey?: string;

    @Prop({ required: false })
    sourceArrayField?: string;

    @Prop({ type: [ColumnMappingSchema], default: [] })
    childColumns: ColumnMapping[];

    @Prop({ required: false })
    junctionTable?: string;

    @Prop({ required: false })
    junctionParentKey?: string;

    @Prop({ required: false })
    junctionChildKey?: string;

    @Prop({ required: false })
    relatedTable?: string;

    @Prop({ required: false })
    relatedPrimaryKey?: string;

    @Prop({ type: [ColumnMappingSchema], default: [] })
    relatedColumns: ColumnMapping[];

    @Prop({ required: false })
    referenceTable?: string;

    @Prop({ required: false })
    referenceQuery?: string;

    @Prop({ required: false, default: 'id' })
    referenceIdField?: string;

    @Prop({ required: false, default: 'name' })
    referenceDisplayField?: string;

    @Prop({ required: false })
    childReferenceKey?: string;
}

export const RelationDefSchema = SchemaFactory.createForClass(RelationDef);

@Schema({ _id: false })
export class TableConfig {
    @Prop({ required: true })
    tableName: string;

    @Prop({ default: false })
    isPrimary: boolean;

    @Prop({ required: true })
    primaryKey: string;

    @Prop({ type: [ColumnMappingSchema], default: [] })
    columns: ColumnMapping[];

    @Prop({ type: [ExtraFieldDefSchema], default: [] })
    extraFields: ExtraFieldDef[];

    @Prop({ type: [RelationDefSchema], default: [] })
    relations: RelationDef[];

    @Prop({ required: false })
    tableSchema?: string;
}

export const TableConfigSchema = SchemaFactory.createForClass(TableConfig);

export type IntegrationConfigDocument = IntegrationConfig & Document;

@Schema({ timestamps: true, collection: 'integrationConfigs', _id: true })
export class IntegrationConfig extends BaseModel {
    _id: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        unique: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({ default: false })
    isActive: boolean;

    @Prop({ required: true, enum: DbType, type: String })
    dbType: DbType;

    @Prop({ required: true })
    encryptedConnection: string;

    @Prop({ type: [TableConfigSchema], default: [] })
    tables: TableConfig[];
}

export const IntegrationConfigSchema =
    SchemaFactory.createForClass(IntegrationConfig);
