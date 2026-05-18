import {
    IsNotEmpty,
    IsString,
    IsNumber,
    IsOptional,
    IsDateString,
    IsMongoId,
} from 'class-validator';

export class UploadInterviewDto {
    @IsNotEmpty()
    @IsMongoId()
    applicantInterviewId: string; // Reference to the scheduled interview

    @IsNotEmpty()
    @IsNumber()
    duration: number; // seconds

    @IsOptional()
    @IsDateString()
    recordedAt?: string;

    @IsOptional()
    @IsString()
    meetingUrl?: string;
}
