export {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Extension methods
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

declare global {
    interface Date {
        isoDate(): string;
        isoTimestamp(): string;
    }
}

Date.prototype.isoDate = function () {
    const timestamp = this.isoTimestamp();
    return timestamp.substring(0, timestamp.indexOf('T'));
};

Date.prototype.isoTimestamp = function () {
    return this.toISOString();
};

/**
 * Return current date in ISO-8601 format `YYYY-MM-DD`.
 */
export function today(): string {
    return new Date().isoDate();
}

/**
 * Return current date time in ISO-8601 format `YYYY-MM-DDTHH:MM:SS.SSSZ`.
 */
export function now(): string {
    return new Date().isoTimestamp();
}

/**
 * Parse ISO-8601 date string.
 *
 * Examples of ISO-8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`.
 */
export function date(date: string): Date {
    return new Date(date);
}
