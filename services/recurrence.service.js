export const buildRecurrenceRule = (frequency, interval = 1) =>
    `RRULE:FREQ=${frequency};INTERVAL=${interval}`;
