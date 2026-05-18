import { Injectable } from '@nestjs/common';
import { v4 as uid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export interface FileInfo {
    filename: string;
    filepath: string;
    url: string;
}

@Injectable()
export class MediaManagerService {
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly folder: string;
    private readonly region: string;

    constructor(private readonly config: ConfigService) {
        this.s3Client = new S3Client({
            endpoint: this.config.get<string>('spaces.endpoint'),
            region: this.config.get<string>('spaces.region'),
            credentials: {
                accessKeyId: this.config.get<string>('spaces.access_key'),
                secretAccessKey: this.config.get<string>('spaces.secret_key'),
            },
        });
        this.bucketName = this.config.get<string>('spaces.bucket');
        this.folder = this.config.get<string>('spaces.folder');
        this.region = this.config.get<string>('spaces.region');
    }

    async upload(
        file: Express.Multer.File,
    ): Promise<[string, boolean, FileInfo]> {
        try {
            const ext = file.originalname.split('.').pop();
            const uniqueFilename = `${uid()}.${ext}`;
            const key = `${this.folder}/${uniqueFilename}`;

            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype || 'application/octet-stream',
                    ACL: 'public-read',
                },
            });

            await upload.done();

            const url = `https://${this.bucketName}.${this.region}.digitaloceanspaces.com/${key}`;

            const fileInfo: FileInfo = {
                filename: uniqueFilename,
                filepath: key,
                url,
            };

            return ['Success', true, fileInfo];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async uploadBuffer(
        buffer: Buffer,
        fileName: string,
        mimeType: string,
    ): Promise<{
        message: string;
        success: boolean;
        fileData: FileInfo | null;
    }> {
        try {
            const ext = fileName.split('.').pop();
            const uniqueFilename = `${uid()}.${ext}`;
            const key = `${this.folder}/${uniqueFilename}`;

            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: this.bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: mimeType || 'application/octet-stream',
                    ACL: 'public-read',
                },
            });

            await upload.done();

            const url = `https://${this.bucketName}.${this.region}.digitaloceanspaces.com/${key}`;

            const fileInfo: FileInfo = {
                filename: uniqueFilename,
                filepath: key,
                url,
            };

            return {
                message: 'Uploaded Successfully',
                success: true,
                fileData: fileInfo,
            };
        } catch (error) {
            return {
                message: error.message,
                success: false,
                fileData: null,
            };
        }
    }
}
