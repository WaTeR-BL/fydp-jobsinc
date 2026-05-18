import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class UpsertMailboxConfigDto {
    @IsString()
    @IsNotEmpty()
    imapHost: string;

    @IsInt()
    @Min(1)
    @Max(65535)
    imapPort: number;

    @IsString()
    @IsNotEmpty()
    imapUser: string;

    @IsString()
    @IsNotEmpty()
    imapPassword: string;

    @IsBoolean()
    useSSL: boolean;
}

export class ToggleMailboxDto {
    @IsBoolean()
    isActive: boolean;
}

export class TestMailboxDto {
    @IsString()
    @IsNotEmpty()
    imapHost: string;

    @IsInt()
    @Min(1)
    @Max(65535)
    imapPort: number;

    @IsString()
    @IsNotEmpty()
    imapUser: string;

    @IsString()
    @IsNotEmpty()
    imapPassword: string;

    @IsBoolean()
    @IsOptional()
    useSSL?: boolean;
}
