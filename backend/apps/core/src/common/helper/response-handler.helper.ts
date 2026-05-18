import { HttpException, HttpStatus } from '@nestjs/common';

export function handleServiceResponse(
    result: [string, boolean] | [string, boolean, any],
) {
    const [message, success, data] = result;

    if (!success) {
        throw new HttpException(
            {
                statusCode: HttpStatus.BAD_REQUEST,
                message,
                data: null,
            },
            HttpStatus.BAD_REQUEST,
        );
    }

    return data !== undefined ? data : null;
}
