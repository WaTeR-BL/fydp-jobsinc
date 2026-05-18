import { ApiProperty } from '@nestjs/swagger';
import 'reflect-metadata';

export function AutoApiProperty(): ClassDecorator {
    return (target: any) => {
        const prototype = target.prototype;

        const keys = Object.getOwnPropertyNames(prototype);

        for (const key of keys) {
            if (key === 'constructor') continue;

            const type = Reflect.getMetadata('design:type', prototype, key);

            if (!type) continue;

            if (
                !Reflect.hasMetadata(
                    'swagger/apiModelProperties',
                    prototype,
                    key,
                )
            ) {
                ApiProperty({ type, required: true })(prototype, key);
            }
        }
    };
}
