import { DateTime } from 'luxon';

export function toUtc(iso: string, timezone?: string): Date {
    return DateTime.fromISO(iso, timezone ? { zone: timezone } : undefined)
        .toUTC()
        .toJSDate();
}

export function toLocal(utcDate: Date, timezone: string) {
    return DateTime.fromJSDate(utcDate).setZone(timezone).toISO();
}
