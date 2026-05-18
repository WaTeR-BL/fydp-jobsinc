export function getEnumText<T extends { [key: string]: string | number }>(
    value: number | T[keyof T],
    enumType?: T,
): string {
    return Object.keys(enumType).find(
        (key) => enumType[key] === value && isNaN(Number(key)),
    );
}
