import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsTimeZone(validationOptions?: ValidationOptions) {
    return function (target: object, propertyName: string) {
        registerDecorator({
            name: 'IsTimeZone',
            target: target.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    if (typeof value !== 'string') return false;
                    try {
                        Intl.DateTimeFormat(undefined, { timeZone: value });
                        return true;
                    } catch {
                        return false;
                    }
                },
            },
        });
    };
}

export function HasTimezone(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'HasTimezone',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: string) {
                    return (
                        typeof value === 'string' &&
                        /([zZ]|[+-]\d{2}:\d{2})$/.test(value)
                    );
                },
            },
        });
    };
}
