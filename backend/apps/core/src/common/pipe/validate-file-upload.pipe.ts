import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateFilesUploadPipe implements PipeTransform {
    private readonly maxFiles = 5;
    private readonly maxImageSize = 10 * 1024 * 1024;
    private readonly maxVideoSize = 200 * 1024 * 1024;
    private readonly allowedImageTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
    ];
    private readonly allowedVideoTypes = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
    ];

    transform(files: Express.Multer.File[]): Express.Multer.File[] {
        if (!files || files.length === 0) {
            return files;
        }

        if (files.length > this.maxFiles) {
            throw new BadRequestException(
                `Maximum ${this.maxFiles} files allowed per post`,
            );
        }

        const hasVideo = files.some((f) => f.mimetype.startsWith('video/'));
        const hasImage = files.some((f) => f.mimetype.startsWith('image/'));

        if (hasVideo && hasImage) {
            throw new BadRequestException(
                'Cannot mix images and videos in the same post',
            );
        }

        if (hasVideo && files.length > 1) {
            throw new BadRequestException('Only one video per post is allowed');
        }

        files.forEach((file, index) => {
            this.validateFile(file, index);
        });

        return files;
    }

    private validateFile(file: Express.Multer.File, index: number): void {
        const isImage = this.allowedImageTypes.includes(file.mimetype);
        const isVideo = this.allowedVideoTypes.includes(file.mimetype);

        if (!isImage && !isVideo) {
            throw new BadRequestException(
                `File ${index + 1} (${file.originalname}): Unsupported file type "${file.mimetype}". ` +
                    `Allowed: JPEG, PNG, GIF, MP4, MOV`,
            );
        }

        if (isImage && file.size > this.maxImageSize) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            throw new BadRequestException(
                `File ${index + 1} (${file.originalname}): Image size ${sizeMB}MB exceeds maximum of 10MB`,
            );
        }

        if (isVideo && file.size > this.maxVideoSize) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            throw new BadRequestException(
                `File ${index + 1} (${file.originalname}): Video size ${sizeMB}MB exceeds maximum of 200MB`,
            );
        }

        if (file.size === 0) {
            throw new BadRequestException(
                `File ${index + 1} (${file.originalname}): File is empty`,
            );
        }
    }
}
