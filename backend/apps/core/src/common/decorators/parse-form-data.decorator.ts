import {
    createParamDecorator,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export const ParseFormData = createParamDecorator(
    async (dtoClass: any, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const body = { ...request.body };

        for (const key in body) {
            if (typeof body[key] === 'string') {
                if (body[key].startsWith('[') || body[key].startsWith('{')) {
                    try {
                        body[key] = JSON.parse(body[key]);
                    } catch {}
                }

                if (!isNaN(body[key]) && body[key] !== '') {
                    body[key] = Number(body[key]);
                }

                if (body[key] === 'true') body[key] = true;
                if (body[key] === 'false') body[key] = false;
            }
        }

        const dto = plainToInstance(dtoClass, body);
        const errors = await validate(dto);

        if (errors.length > 0) {
            const messages = errors.map((error) => ({
                field: error.property,
                errors: Object.values(error.constraints || {}),
            }));
            throw new BadRequestException({
                message: 'Validation failed',
                errors: messages,
            });
        }

        return dto;
    },
);
