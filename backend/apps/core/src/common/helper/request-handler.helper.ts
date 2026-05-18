export function parseJsonIfString(value: any): any {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    }
    return value;
}
