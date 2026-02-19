import { Temporal } from '@js-temporal/polyfill';

export interface EventDateTime {
  localWallTime: string;
  timeZone: string;
}

export function eventDateTimeToUTC(localWallTime: string, timeZone: string): Date {
  const isoString = `${localWallTime}:00[${timeZone}]`;
  
  try {
    const zonedDateTime = Temporal.ZonedDateTime.from(isoString);
    const instant = zonedDateTime.toInstant();
    return new Date(instant.epochMilliseconds);
  } catch (error) {
    throw new Error(`Invalid datetime or timezone: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function utcToEventDateTime(utcDate: Date | string, timeZone: string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  
  try {
    const instant = Temporal.Instant.fromEpochMilliseconds(date.getTime());
    const zonedDateTime = instant.toZonedDateTimeISO(timeZone);
    
    const year = zonedDateTime.year.toString().padStart(4, '0');
    const month = zonedDateTime.month.toString().padStart(2, '0');
    const day = zonedDateTime.day.toString().padStart(2, '0');
    const hour = zonedDateTime.hour.toString().padStart(2, '0');
    const minute = zonedDateTime.minute.toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    throw new Error(`Failed to convert to event timezone: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
